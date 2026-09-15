import { handleApiError, NotFoundError } from "@/lib/api-error";
import { getCurrentAppUser, requireAuth } from "@/lib/auth";
import { stripeSessionIdSchema } from "@/modules/checkout/schemas/checkout.schema";
import { toOrderSummary } from "@/server/checkout/order-summary";
import { orderRepository } from "@/server/repositories/order.repository";

// Mismo mensaje para "no existe" y "no es tuya": distinguirlos convertiría el
// endpoint en un oráculo de qué sesiones de Checkout existen.
const NOT_FOUND_MESSAGE = "No encontramos esa compra.";

/**
 * Estado de la compra para la página de retorno. Solo lee: quien escribe el
 * pago es el webhook, así que una orden recién creada puede seguir en `pending`
 * y el cliente reintenta hasta que llegue el evento de Stripe.
 */
export async function GET(
  _request: Request,
  ctx: RouteContext<"/api/orders/by-session/[sessionId]">,
) {
  try {
    await requireAuth();

    const [{ sessionId }, user] = await Promise.all([
      ctx.params,
      getCurrentAppUser(),
    ]);

    const parsed = stripeSessionIdSchema.parse(sessionId);
    const order = await orderRepository.findBySessionId(parsed);

    if (!order || !user || order.userId !== user.id) {
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
