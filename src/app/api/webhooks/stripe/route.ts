import { z } from "zod";

import { handleApiError, jsonError } from "@/lib/api-error";
import { logAudit } from "@/lib/audit";
import { getStripe, getStripeWebhookSecret } from "@/lib/stripe";
import { getDb } from "@/server/db";
import { orderRepository } from "@/server/repositories/order.repository";
import { paymentMethodRepository } from "@/server/repositories/payment-method.repository";

import type { Tx } from "@/server/db";
import type { OrderRow } from "@/server/repositories/order.repository";
import type { NextRequest } from "next/server";
import type Stripe from "stripe";

// Endpoint público a propósito, igual que el webhook de Clerk: detrás de un
// webhook no hay sesión. La autenticación es la firma de Stripe.

const INVALID_SIGNATURE_MESSAGE =
  "No se pudo verificar la firma del webhook.";

// El `metadata` de Stripe es un mapa de strings libre: lo que viaja ahí se
// valida como cualquier otra entrada antes de tocar la base.
const appUserIdSchema = z.uuid();
const orderIdSchema = z.uuid();

function resolvePaymentIntentId(
  session: Stripe.Checkout.Session,
): string | null {
  return typeof session.payment_intent === "string"
    ? session.payment_intent
    : (session.payment_intent?.id ?? null);
}

/**
 * Cómo localizar y marcar la orden dentro de la transacción del webhook. Los
 * dos caminos de pago la identifican distinto —por sesión de Checkout o por el
 * `orderId` que viajó en el PaymentIntent—, pero lo que hay que hacer después
 * es exactamente lo mismo: por eso se inyecta la marca en vez de duplicar el
 * fulfillment.
 *
 * Devolver `null` significa "no hay nada que hacer": la orden ya estaba en ese
 * estado o el evento no corresponde a ninguna orden de esta tienda.
 */
type MarkOrder = (tx: Tx) => Promise<OrderRow | null>;

/**
 * Fulfillment. Todo en una transacción: si el descuento de stock o el registro
 * de auditoría fallan, la orden no queda marcada como pagada y el reintento de
 * Stripe vuelve a intentarlo entero.
 *
 * Un evento reenviado no descuenta stock dos veces: la marca devuelve `null`
 * cuando la orden ya estaba pagada y acá se corta.
 */
async function fulfill(markPaid: MarkOrder): Promise<void> {
  await getDb().transaction(async (tx) => {
    const order = await markPaid(tx);

    if (!order) {
      return;
    }

    const shortages = await orderRepository.decrementStock(order.id, tx);

    await logAudit(tx, {
      action: "order.paid",
      entityType: "order",
      entityId: order.id,
      actorId: order.userId,
      changes: { before: { status: "pending" }, after: { status: "paid" } },
      metadata: {
        source: "stripe_webhook",
        totalCents: order.totalCents,
        currency: order.currency,
      },
    });

    // Sobreventa: entre crear la sesión y cobrar, alguien más se llevó las
    // últimas unidades. El dinero ya está cobrado, así que la orden se paga
    // igual, el stock queda en 0 y el caso queda registrado para resolverlo a
    // mano. Devolver un error a Stripe solo provocaría reintentos infinitos.
    if (shortages.length > 0) {
      await logAudit(tx, {
        action: "order.stock_shortage",
        entityType: "order",
        entityId: order.id,
        actorId: order.userId,
        metadata: { source: "stripe_webhook", shortages },
        severity: "warning",
      });
    }
  });
}

async function failPayment(markFailed: MarkOrder): Promise<void> {
  await getDb().transaction(async (tx) => {
    const order = await markFailed(tx);

    if (!order) {
      return;
    }

    await logAudit(tx, {
      action: "order.payment_failed",
      entityType: "order",
      entityId: order.id,
      actorId: order.userId,
      changes: {
        before: { status: "pending" },
        after: { status: "payment_failed" },
      },
      metadata: { source: "stripe_webhook" },
      severity: "warning",
    });
  });
}

/**
 * Alta de tarjeta guardada. Llega por `checkout.session.completed` con
 * `mode: "setup"`: no hubo cobro, solo un SetupIntent que quedó asociado al
 * Customer. La fila se escribe acá y no en `success_url` porque quien guarda la
 * tarjeta puede cerrar la pestaña antes de volver a la tienda.
 *
 * `session.setup_intent` llega como id, así que hace falta el `retrieve` con
 * `expand` para leer la marca y los últimos cuatro dígitos.
 */
async function saveSetupPaymentMethod(
  session: Stripe.Checkout.Session,
): Promise<void> {
  const setupIntentId =
    typeof session.setup_intent === "string"
      ? session.setup_intent
      : (session.setup_intent?.id ?? null);

  const userId = appUserIdSchema.safeParse(session.metadata?.appUserId);

  // Sin dueño o sin SetupIntent no hay nada que guardar: es una sesión que no
  // creó esta aplicación. Se ignora en silencio para no provocar reintentos.
  if (!setupIntentId || !userId.success) {
    return;
  }

  const intent = await getStripe().setupIntents.retrieve(setupIntentId, {
    expand: ["payment_method"],
  });

  const method = intent.payment_method;

  // Sin `expand` el campo sería un id: el objeto expandido se comprueba en vez
  // de afirmarse con un cast. Solo se guardan tarjetas (`docs/specs/012`).
  if (typeof method !== "object" || method === null || !method.card) {
    return;
  }

  const card = method.card;

  await getDb().transaction(async (tx) => {
    const { row, created } = await paymentMethodRepository.upsertFromStripe(
      {
        userId: userId.data,
        stripePaymentMethodId: method.id,
        brand: card.brand,
        last4: card.last4,
        expMonth: card.exp_month,
        expYear: card.exp_year,
      },
      tx,
    );

    // El reenvío del mismo evento no vuelve a auditar: `audit_logs` es
    // append-only y un alta duplicada contaría dos altas que no ocurrieron.
    if (!created) {
      return;
    }

    await logAudit(tx, {
      action: "payment_method.created",
      entityType: "payment_method",
      entityId: row.id,
      actorId: row.userId,
      // Nunca el `pm_…` ni el Customer: son tokens y la tabla no se borra.
      metadata: {
        source: "stripe_webhook",
        brand: row.brand,
        last4: row.last4,
      },
    });
  });
}

async function handleEvent(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded": {
      const session = event.data.object;

      // El mismo evento cubre dos flujos distintos: `setup` guarda una tarjeta
      // y no cobra nada, `payment` es una compra.
      if (session.mode === "setup") {
        await saveSetupPaymentMethod(session);

        break;
      }

      // `unpaid` es un pago demorado que todavía no se cobró: el fulfillment
      // espera al `async_payment_succeeded`.
      if (session.payment_status !== "unpaid") {
        await fulfill((tx) =>
          orderRepository.markPaid(
            session.id,
            resolvePaymentIntentId(session),
            tx,
          ),
        );
      }

      break;
    }

    case "checkout.session.async_payment_failed": {
      const session = event.data.object;

      await failPayment((tx) =>
        orderRepository.markPaymentFailed(session.id, tx),
      );

      break;
    }

    // Cierre del pago con tarjeta guardada. El flujo hosteado también emite
    // estos eventos, pero sus PaymentIntents no llevan `orderId` en `metadata`
    // —lo lleva la sesión— y por eso se ignoran acá: los cierra
    // `checkout.session.completed` y contarlos dos veces descontaría stock dos
    // veces.
    case "payment_intent.succeeded": {
      const intent = event.data.object;
      const orderId = orderIdSchema.safeParse(intent.metadata?.orderId);

      if (orderId.success) {
        await fulfill((tx) =>
          orderRepository.markPaidByPaymentIntent(orderId.data, intent.id, tx),
        );
      }

      break;
    }

    case "payment_intent.payment_failed": {
      const intent = event.data.object;
      const orderId = orderIdSchema.safeParse(intent.metadata?.orderId);

      if (orderId.success) {
        await failPayment((tx) =>
          orderRepository.markPaymentFailedByPaymentIntent(
            orderId.data,
            intent.id,
            tx,
          ),
        );
      }

      break;
    }

    default:
      break;
  }
}

export async function POST(request: NextRequest) {
  const signature = request.headers.get("stripe-signature");
  // `text()` y no `json()`: la firma se calcula sobre el cuerpo crudo y
  // cualquier reserialización la invalida.
  const rawBody = await request.text();

  // La configuración se resuelve fuera del try de la firma: si falta el secreto
  // el problema es del despliegue (500), no del emisor del webhook (400).
  let stripe: Stripe;
  let secret: string;

  try {
    stripe = getStripe();
    secret = getStripeWebhookSecret();
  } catch (error: unknown) {
    return handleApiError(error);
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(rawBody, signature ?? "", secret);
  } catch (error: unknown) {
    console.error("Webhook de Stripe: firma inválida.", error);

    return jsonError(400, INVALID_SIGNATURE_MESSAGE);
  }

  try {
    await handleEvent(event);

    // 204 sin cuerpo: Stripe reintenta cualquier respuesta que no sea 2xx.
    return new Response(null, { status: 204 });
  } catch (error: unknown) {
    // 500 a propósito ante un fallo de base de datos: el reintento de Stripe es
    // exactamente lo que se quiere en ese caso.
    return handleApiError(error);
  }
}
