import { handleApiError, NotFoundError } from "@/lib/api-error";
import { getCurrentAppUser, requireAuth } from "@/lib/auth";
import { orderIdSchema } from "@/modules/orders/schemas/order-history.schema";
import { toOrderSummary } from "@/server/checkout/order-summary";
import { orderRepository } from "@/server/repositories/order.repository";

// Mismo mensaje para "no existe" y "no es tuya": distinguirlos convertiría el
// endpoint en un oráculo de qué órdenes existen.
const NOT_FOUND_MESSAGE = "No encontramos esa compra.";

/**
 * Estado de la compra por su id. Es la contracara de `by-session` para el pago
 * con tarjeta guardada, que no crea sesión de Checkout y vuelve a la tienda con
 * `?order_id=`. Solo lee: el pago lo escribe el webhook, así que la orden puede
 * seguir en `pending` y el cliente reintenta.
 */
export async function GET(
  _request: Request,
  ctx: RouteContext<"/api/orders/[id]">,
) {
  try {
    await requireAuth();

    const [{ id }, user] = await Promise.all([ctx.params, getCurrentAppUser()]);

    const orderId = orderIdSchema.parse(id);
    const order = user
      ? await orderRepository.findByIdForUserWithItems(orderId, user.id)
      : null;

    if (!order) {
      throw new NotFoundError(NOT_FOUND_MESSAGE);
    }

    return Response.json(
      { data: toOrderSummary(order) },
      // Dato privado y que cambia con el webhook: nunca se cachea.
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error: unknown) {
    return handleApiError(error);
  }
}
