import { ORDER_STATUSES, SALES_WINDOW_DAYS } from "../constants";

import type { OrdersByStatusPoint, SalesByDayPoint } from "../types/dashboard";

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Relleno de las series del dashboard: la BD solo devuelve los grupos que
 * existen, y un gráfico con huecos miente (un día sin ventas es una venta de
 * cero, no la ausencia de un punto).
 *
 * El día civil de estas series es el de **UTC**, no el de la tienda: la
 * agregación pasa en Postgres y estas claves tienen que coincidir carácter a
 * carácter con las del repositorio o el merge pierde puntos. Por eso no se
 * reutiliza `toStoreDay()` de `modules/orders/lib/date-range.ts`, que desplaza
 * a -05:00 porque ahí lo que importa es el día que el cliente vio en su compra.
 */

/** Instante → día civil en UTC: `2026-09-16`. */
export function toUtcDay(instant: Date): string {
  return instant.toISOString().slice(0, 10);
}

/**
 * Los `days` últimos días civiles UTC en orden ascendente, contando el de
 * `now`: `lastUtcDays(1)` es solo hoy. `days` menor que 1 no tiene serie.
 */
export function lastUtcDays(days: number, now: Date = new Date()): string[] {
  if (days < 1) {
    return [];
  }

  const end = new Date(`${toUtcDay(now)}T00:00:00Z`).getTime();
  const result: string[] = [];

  for (let offset = days - 1; offset >= 0; offset -= 1) {
    result.push(toUtcDay(new Date(end - offset * DAY_MS)));
  }

  return result;
}

/**
 * Serie de ventas con exactamente `days` puntos: los días que la consulta no
 * devolvió salen en cero. Un punto fuera de la ventana se descarta —la ventana
 * manda sobre lo que llegue— y dos puntos del mismo día se suman, que es lo
 * único que no pierde dinero si el agrupado de la BD cambia.
 */
export function fillSalesByDay(
  points: SalesByDayPoint[],
  days: number = SALES_WINDOW_DAYS,
  now: Date = new Date(),
): SalesByDayPoint[] {
  const totals = new Map<string, number>();

  for (const point of points) {
    totals.set(point.day, (totals.get(point.day) ?? 0) + point.totalCents);
  }

  return lastUtcDays(days, now).map((day) => ({
    day,
    totalCents: totals.get(day) ?? 0,
  }));
}

/**
 * Los tres estados de `order_status` siempre presentes y en el orden del ciclo
 * de vida: un estado sin órdenes es una barra en cero, no una barra que falta.
 * Un estado desconocido en la entrada se ignora; dos filas del mismo estado se
 * suman.
 */
export function fillOrdersByStatus(
  points: OrdersByStatusPoint[],
): OrdersByStatusPoint[] {
  const totals = new Map<OrdersByStatusPoint["status"], number>();

  for (const point of points) {
    totals.set(point.status, (totals.get(point.status) ?? 0) + point.total);
  }

  return ORDER_STATUSES.map((status) => ({
    status,
    total: totals.get(status) ?? 0,
  }));
}
