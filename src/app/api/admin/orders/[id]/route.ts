import { handleApiError, NotFoundError } from "@/lib/api-error";
import { PERMISSIONS, requirePermission } from "@/lib/permissions";
import { adminOrderIdSchema } from "@/modules/orders/schemas/admin-order.schema";
import { orderRepository } from "@/server/repositories/order.repository";

/**
 * Detalle de cualquier orden de la tienda. A diferencia de `/api/orders/[id]`,
 * aquí no hay filtro por dueño: lo que autoriza es el permiso `orders.read`, no
 * la propiedad de la orden.
 */
export async function GET(
  _request: Request,
  ctx: RouteContext<"/api/admin/orders/[id]">,
) {
  try {
    await requirePermission(PERMISSIONS.ORDERS_READ);

    const orderId = adminOrderIdSchema.parse((await ctx.params).id);
    const order = await orderRepository.findByIdWithItemsForAdmin(orderId);

    if (!order) {
      throw new NotFoundError("La orden no existe.");
    }

    return Response.json({ data: order });
  } catch (error: unknown) {
    return handleApiError(error);
  }
}
