import { toStoreDay } from "./date-range";

import type { OrderSummary } from "@/modules/checkout/types/order";
import type { OrderHistoryGroup } from "../types/order-history";

/**
 * Agrupa las compras por día civil de la tienda y suma el importe de cada día.
 * Los grupos y las compras de dentro salen en orden descendente: lo último
 * comprado es lo primero que la persona busca.
 *
 * Las fechas son `YYYY-MM-DD` e ISO-8601, así que ordenarlas como texto es
 * ordenarlas cronológicamente y evita construir un `Date` por comparación.
 */
export function groupOrdersByDay(orders: OrderSummary[]): OrderHistoryGroup[] {
  const byDay = new Map<string, OrderHistoryGroup>();

  for (const order of orders) {
    const date = toStoreDay(new Date(order.createdAt));
    const group = byDay.get(date);

    if (group) {
      group.orders.push(order);
      group.totalCents += order.totalCents;

      continue;
    }

    byDay.set(date, { date, totalCents: order.totalCents, orders: [order] });
  }

  const groups = [...byDay.values()];

  for (const group of groups) {
    group.orders.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  return groups.sort((a, b) => b.date.localeCompare(a.date));
}
