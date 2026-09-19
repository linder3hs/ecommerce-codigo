import { handleApiError } from "@/lib/api-error";
import { PERMISSIONS, requirePermission } from "@/lib/permissions";
import { adminOrderQuerySchema } from "@/modules/orders/schemas/admin-order.schema";
import { orderRepository } from "@/server/repositories/order.repository";

import type { PageMeta } from "@/types/api";

/**
 * Listado de órdenes del panel. Solo lectura: la orden es un hecho contable y
 * este archivo no expone ningún punto de creación ni de borrado. Lo único
 * mutable es el `status`, y vive en `[id]/status`.
 */
export async function GET(request: Request) {
  try {
    await requirePermission(PERMISSIONS.ORDERS_READ);

    const { searchParams } = new URL(request.url);
    const params = adminOrderQuerySchema.parse(
      Object.fromEntries(searchParams.entries()),
    );

    // El cliente de cada fila lo resuelve el repositorio con un solo innerJoin,
    // y la paginación es LIMIT/OFFSET en Postgres: no se trae la tabla entera.
    const { rows, total } = await orderRepository.list(params);

    const meta: PageMeta = {
      page: params.page,
      pageSize: params.pageSize,
      total,
      totalPages: Math.ceil(total / params.pageSize),
    };

    return Response.json({ data: rows, meta });
  } catch (error: unknown) {
    return handleApiError(error);
  }
}
