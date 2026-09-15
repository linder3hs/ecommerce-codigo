import {
  ConflictError,
  handleApiError,
  NotFoundError,
} from "@/lib/api-error";
import { getCurrentAppUser, requireAuth } from "@/lib/auth";
import { APP_URL } from "@/lib/constants";
import { asStripeCardError, getStripe } from "@/lib/stripe";
import { payWithSavedInputSchema } from "@/modules/checkout/schemas/checkout.schema";
import { resolveCartForPayment } from "@/server/checkout/resolve-cart";
import { orderRepository } from "@/server/repositories/order.repository";
import { paymentMethodRepository } from "@/server/repositories/payment-method.repository";
import { userRepository } from "@/server/repositories/user.repository";

import type { PayResult } from "@/modules/checkout/types/order";
import type { NextRequest } from "next/server";
import type Stripe from "stripe";

// El espejo local de `users` puede ir un instante detrás de Clerk (webhook
// at-least-once). Es un 409 y no un 500: reintentar en unos segundos funciona.
const SYNCING_MESSAGE =
  "Tu cuenta se está sincronizando. Volvé a intentar en unos segundos.";

// Mismo mensaje para "no existe" y "no es tuya": distinguirlos convertiría el
// endpoint en un oráculo de qué tarjetas hay guardadas.
const NOT_FOUND_MESSAGE = "No encontramos esa tarjeta.";

const DECLINED_MESSAGE =
  "El pago no se pudo completar con esa tarjeta. Probá con otra.";

// Sin Stripe.js en el navegador, la única autenticación que se puede atender es
// la que se resuelve saliendo a una URL. El resto cae al flujo hosteado.
const UNSUPPORTED_ACTION_MESSAGE =
  "Tu banco pide una verificación que no podemos mostrar acá. Usá la opción de pagar con otra tarjeta.";

// Dato privado y de un solo uso: nunca se cachea en ningún borde.
function payResponse(result: PayResult): Response {
  return Response.json(
    { data: result },
    { headers: { "Cache-Control": "no-store" } },
  );
}

function resolveRedirectUrl(intent: Stripe.PaymentIntent): string | null {
  const action = intent.next_action;

  return action?.type === "redirect_to_url"
    ? (action.redirect_to_url?.url ?? null)
    : null;
}

/**
 * Cobra con una tarjeta ya guardada. Vive aparte de `/checkout/session` porque
 * es otra API de Stripe —PaymentIntents confirmado en el servidor, no una
 * sesión hosteada— y devuelve otra cosa: un desenlace, no una URL a la que
 * mandar el navegador siempre.
 *
 * El body manda el uuid de NUESTRA fila, nunca el `pm_…`: el token lo resuelve
 * el servidor, y una tarjeta ajena muere en el 404 antes de crear nada.
 *
 * La respuesta jamás dice "pagado". El fulfillment —stock y auditoría— es del
 * webhook, igual que en el flujo hosteado.
 */
export async function POST(request: NextRequest) {
  try {
    // 401 si no hay sesión de Clerk; el espejo local se resuelve después.
    await requireAuth();

    const user = await getCurrentAppUser();

    if (!user) {
      throw new ConflictError(SYNCING_MESSAGE);
    }

    const { items, paymentMethodId } = payWithSavedInputSchema.parse(
      await request.json(),
    );

    const [method, customer] = await Promise.all([
      paymentMethodRepository.findByIdForUser(paymentMethodId, user.id),
      userRepository.findStripeCustomerId(user.id),
    ]);

    // Sin Customer no hay tarjeta que cobrar: la fila y el Customer se escriben
    // juntos, así que su ausencia es el mismo 404 que una tarjeta ajena.
    if (!method || !customer) {
      throw new NotFoundError(NOT_FOUND_MESSAGE);
    }

    // Antes de crear nada: un producto agotado o despublicado es 409 y no deja
    // una orden colgada.
    const cart = await resolveCartForPayment(items);

    // La orden se escribe primero para que su id viaje en `metadata` y el
    // webhook sepa qué cobrar sin depender de que la columna del PaymentIntent
    // ya esté guardada.
    const order = await orderRepository.createPendingForPaymentIntent({
      id: crypto.randomUUID(),
      userId: user.id,
      currency: cart.currency,
      items: cart.orderItems,
    });

    let intent: Stripe.PaymentIntent;

    try {
      intent = await getStripe().paymentIntents.create({
        amount: cart.totalCents,
        currency: cart.currency,
        customer,
        payment_method: method.stripePaymentMethodId,
        // Confirmación en el servidor: quien compra ya eligió su tarjeta y no
        // hay ninguna pantalla más que mostrarle.
        confirm: true,
        // Destino del 3DS que se resuelve por redirect.
        return_url: `${APP_URL}/checkout/success?order_id=${order.id}`,
        metadata: { orderId: order.id },
        // Sin `payment_method_types`: omitirlo deja que Stripe resuelva el
        // método a partir de la tarjeta guardada.
      });
    } catch (error: unknown) {
      const declined = asStripeCardError(error);

      await orderRepository.markPaymentFailedByPaymentIntent(
        order.id,
        declined?.payment_intent?.id ?? null,
      );

      // El rechazo del emisor es una respuesta, no un fallo: su mensaje está
      // escrito para mostrárselo a quien compra.
      if (declined) {
        return payResponse({
          orderId: order.id,
          status: "failed",
          message: declined.message ?? DECLINED_MESSAGE,
        });
      }

      throw error;
    }

    if (intent.status === "succeeded" || intent.status === "processing") {
      return payResponse({ orderId: order.id, status: "processing" });
    }

    const redirectUrl =
      intent.status === "requires_action" ? resolveRedirectUrl(intent) : null;

    if (redirectUrl) {
      return payResponse({
        orderId: order.id,
        status: "requires_action",
        redirectUrl,
      });
    }

    await orderRepository.markPaymentFailedByPaymentIntent(order.id, intent.id);

    return payResponse({
      orderId: order.id,
      status: "failed",
      message:
        intent.status === "requires_action"
          ? UNSUPPORTED_ACTION_MESSAGE
          : (intent.last_payment_error?.message ?? DECLINED_MESSAGE),
    });
  } catch (error: unknown) {
    return handleApiError(error);
  }
}
