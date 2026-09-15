import { ConflictError, handleApiError } from "@/lib/api-error";
import { getCurrentAppUser, requireAuth } from "@/lib/auth";
import { APP_URL } from "@/lib/constants";
import { getStripe } from "@/lib/stripe";
import { checkoutSessionInputSchema } from "@/modules/checkout/schemas/checkout.schema";
import { resolveCartForPayment } from "@/server/checkout/resolve-cart";
import { orderRepository } from "@/server/repositories/order.repository";

import type { NextRequest } from "next/server";

// El espejo local de `users` puede ir un instante detrás de Clerk (webhook
// at-least-once). Es un 409 y no un 500: reintentar en unos segundos funciona.
const SYNCING_MESSAGE =
  "Tu cuenta se está sincronizando. Volvé a intentar en unos segundos.";

const SUCCESS_URL = `${APP_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}`;
const CANCEL_URL = `${APP_URL}/checkout/cancel`;

/**
 * Abre el pago con tarjeta nueva en la página hosteada de Stripe. El body solo
 * dice qué producto y cuántas unidades: precio, stock y disponibilidad los
 * relee `resolveCartForPayment`, así que un carrito manipulado en el navegador
 * no puede cambiar lo que se cobra.
 */
export async function POST(request: NextRequest) {
  try {
    // 401 si no hay sesión de Clerk; el espejo local se resuelve después.
    await requireAuth();

    const user = await getCurrentAppUser();

    if (!user) {
      throw new ConflictError(SYNCING_MESSAGE);
    }

    const { items } = checkoutSessionInputSchema.parse(await request.json());
    const cart = await resolveCartForPayment(items);

    // El id se genera acá porque `metadata.orderId` viaja en la sesión de
    // Stripe: la sesión se crea primero y la fila se escribe con su id ya
    // definitivo, en vez de guardar un identificador provisional y corregirlo.
    // Si el insert fallara, la respuesta es un error y nadie llega a pagar.
    const orderId = crypto.randomUUID();

    const session = await getStripe().checkout.sessions.create({
      mode: "payment",
      line_items: cart.lineItems,
      success_url: SUCCESS_URL,
      cancel_url: CANCEL_URL,
      // Sin `payment_method_types`: omitirlo habilita los métodos dinámicos que
      // se administran desde el Dashboard.
      metadata: { orderId },
      client_reference_id: user.id,
    });

    if (!session.url) {
      throw new Error("Stripe no devolvió una URL de Checkout.");
    }

    await orderRepository.createPending({
      id: orderId,
      userId: user.id,
      currency: cart.currency,
      stripeCheckoutSessionId: session.id,
      items: cart.orderItems,
    });

    return Response.json({ url: session.url });
  } catch (error: unknown) {
    return handleApiError(error);
  }
}
