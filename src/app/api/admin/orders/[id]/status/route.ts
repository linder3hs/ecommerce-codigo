import {
  ConflictError,
  handleApiError,
  jsonError,
  NotFoundError,
} from "@/lib/api-error";
import { logAudit } from "@/lib/audit";
import { getCurrentAppUser } from "@/lib/auth";
import { PERMISSIONS, requirePermission } from "@/lib/permissions";
import {
  adminOrderIdSchema,
  updateOrderStatusSchema,
} from "@/modules/orders/schemas/admin-order.schema";
import { getDb } from "@/server/db";
import { orderRepository } from "@/server/repositories/order.repository";

/**
 * Corrección manual del estado de una orden. Lo único mutable de una orden: no
 * se crean, no se borran y no se editan sus líneas ni sus importes.
 *
 * `expectedStatus` es el estado que el admin tenía en pantalla y viaja al WHERE
 * del `UPDATE`. Entre la lectura y la confirmación el webhook de Stripe puede
 * haber movido la orden: si ya no coincide no se escribe nada y la respuesta es
 * 409 para que la UI recargue.
 *
 * Marcar `paid` a mano no descuenta stock: `decrementStock` es del webhook, en
 * su propia transacción.
 */
export async function PATCH(
  request: Request,
  ctx: RouteContext<"/api/admin/orders/[id]/status">,
) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return jsonError(400, "El cuerpo de la petición no es JSON válido.");
  }

  try {
    await requirePermission(PERMISSIONS.ORDERS_UPDATE_STATUS);

    const orderId = adminOrderIdSchema.parse((await ctx.params).id);
    const { status, expectedStatus } = updateOrderStatusSchema.parse(body);

    // Cambiar al mismo estado no es un conflicto ni una carrera: es una
    // petición sin sentido, y escribirla dejaría un `audit_logs` que no
    // describe ningún cambio.
    if (status === expectedStatus) {
      return jsonError(400, "La orden ya está en ese estado.");
    }

    const actor = await getCurrentAppUser();

    // Regla dura #9: el cambio de estado y su registro de auditoría en la misma
    // transacción.
    await getDb().transaction(async (tx) => {
      const updated = await orderRepository.setStatus(
        orderId,
        status,
        expectedStatus,
        tx,
      );

      if (!updated) {
        throw new ConflictError(
          "El estado de la orden cambió desde que la abriste. Recarga para ver el estado actual.",
        );
      }

      await logAudit(tx, {
        action: "order.status_changed",
        entityType: "order",
        entityId: orderId,
        actorId: actor?.id ?? null,
        // Solo el estado, antes y después: sin email, sin ids de Stripe y sin
        // importes. `audit_logs` es append-only y lo que entra no se borra.
        changes: {
          before: { status: expectedStatus },
          after: { status },
        },
        severity: "warning",
      });
    });

    // `setStatus` devuelve la fila de `orders`, sin cliente ni líneas, y la
    // pantalla necesita la orden completa tras confirmar.
    const order = await orderRepository.findByIdWithItemsForAdmin(orderId);

    if (!order) {
      throw new NotFoundError("La orden no existe.");
    }

    return Response.json({ data: order });
  } catch (error: unknown) {
    return handleApiError(error);
  }
}
