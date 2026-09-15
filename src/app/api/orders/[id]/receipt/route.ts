import { handleApiError, NotFoundError } from "@/lib/api-error";
import { getCurrentAppUser, requireAuth } from "@/lib/auth";
import { getStripe } from "@/lib/stripe";
import { orderIdSchema } from "@/modules/orders/schemas/order-history.schema";
import { orderRepository } from "@/server/repositories/order.repository";

// Un solo mensaje para "no existe", "no es tuya" y "todavía no hay boleta":
// distinguirlos convertiría el endpoint en un oráculo de qué órdenes existen.
const NOT_FOUND_MESSAGE = "La boleta todavía no está disponible.";

/**
 * Boleta de la compra. No hay columna que la cachee: sale de `latest_charge`
 * del PaymentIntent en cada consulta, así que es un endpoint aparte y no un
 * campo de la lista —resolverla para treinta compras serían treinta llamadas a
 * Stripe por render.
 */
export async function GET(
  _request: Request,
  ctx: RouteContext<"/api/orders/[id]/receipt">,
) {
  try {
    await requireAuth();

    const [{ id }, user] = await Promise.all([ctx.params, getCurrentAppUser()]);

    const orderId = orderIdSchema.parse(id);
    const order = user
      ? await orderRepository.findByIdForUser(orderId, user.id)
      : null;

    // Solo una compra pagada tiene cargo, y sin `payment_intent` no hay nada
    // que preguntarle a Stripe.
    if (!order || order.status !== "paid" || !order.stripePaymentIntentId) {
      throw new NotFoundError(NOT_FOUND_MESSAGE);
    }

    const intent = await getStripe().paymentIntents.retrieve(
      order.stripePaymentIntentId,
      { expand: ["latest_charge"] },
    );

    // Sin `expand` el campo sería un id: el objeto expandido se comprueba en
    // vez de afirmarse con un cast.
    const charge = intent.latest_charge;
    const receiptUrl =
      typeof charge === "object" && charge !== null ? charge.receipt_url : null;

    if (!receiptUrl) {
      throw new NotFoundError(NOT_FOUND_MESSAGE);
    }

    return Response.json(
      { data: { receiptUrl } },
      // El enlace de Stripe es privado y caduca: no se cachea en ningún borde.
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error: unknown) {
    return handleApiError(error);
  }
}
