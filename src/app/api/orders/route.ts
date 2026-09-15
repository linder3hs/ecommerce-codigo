import { handleApiError } from "@/lib/api-error";
import { getCurrentAppUser, requireAuth } from "@/lib/auth";
import {
  currentMonthRange,
  rangeToInstants,
} from "@/modules/orders/lib/date-range";
import { groupOrdersByDay } from "@/modules/orders/lib/group-orders";
import { orderHistoryQuerySchema } from "@/modules/orders/schemas/order-history.schema";
import { orderRepository } from "@/server/repositories/order.repository";

import type { OrderSummary } from "@/modules/checkout/types/order";
import type { OrderHistoryData } from "@/modules/orders/types/order-history";
import type { OrderWithItemsRow } from "@/server/repositories/order.repository";

// Misma proyección que `/api/orders/by-session`: la lista y el detalle muestran
// lo mismo. Segunda repetición, no se extrae todavía (CLAUDE.md §6).
function toSummary(order: OrderWithItemsRow): OrderSummary {
  return {
    id: order.id,
    status: order.status,
    totalCents: order.totalCents,
    currency: order.currency,
    createdAt: order.createdAt.toISOString(),
    items: order.items.map((item) => ({
      id: item.id,
      productId: item.productId,
      nameSnapshot: item.nameSnapshot,
      unitPriceCents: item.unitPriceCents,
      qty: item.qty,
    })),
  };
}

/**
 * Historial de compras del usuario de la sesión, agrupado por día. Solo lee.
 *
 * La autenticación va antes de la validación: sin sesión no se gasta ni un
 * parseo, y mucho menos una consulta.
 */
export async function GET(request: Request) {
  try {
    await requireAuth();

    const { searchParams } = new URL(request.url);

    const query = orderHistoryQuerySchema.parse(
      Object.fromEntries(searchParams.entries()),
    );

    const range =
      query.from !== undefined && query.to !== undefined
        ? { from: query.from, to: query.to }
        : currentMonthRange();

    console.log({ range });

    const user = await getCurrentAppUser();

    console.log("id", user?.id);

    // El espejo de `users` puede ir un instante detrás de Clerk (webhook
    // asíncrono). Sin fila local no hay compras posibles: se responde el
    // historial vacío en vez de un error que la vista no podría explicar.
    const rows = user
      ? await orderRepository.findManyByUserInRange({
          userId: user.id,
          ...rangeToInstants(range.from, range.to),
        })
      : [];

    console.log(rows);

    const orders = rows.map(toSummary);

    const data: OrderHistoryData = {
      range,
      groups: groupOrdersByDay(orders),
      count: orders.length,
      totalCents: orders.reduce((total, order) => total + order.totalCents, 0),
    };

    return Response.json(
      { data },
      // Historial de una persona: privado, nunca se cachea.
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error: unknown) {
    return handleApiError(error);
  }
}
