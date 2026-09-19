import "server-only";

import { and, asc, count, eq, gte, isNull, lte, sql, sum } from "drizzle-orm";

import { getDb, type Db, type Tx } from "@/server/db";
import { orders } from "@/server/db/schema/order";
import { products } from "@/server/db/schema/product";

import type { OrderStatus } from "./order.repository";

export type DailyPaidTotal = {
  /** Día civil en UTC, `YYYY-MM-DD`. */
  day: string;
  totalCents: number;
};

export type OrdersStatusCount = {
  status: OrderStatus;
  total: number;
};

export type LowStockProductRow = {
  id: string;
  name: string;
  sku: string;
  stock: number;
};

/**
 * Clave de agrupado de la serie de ventas. `at time zone 'UTC'` es
 * imprescindible: `date_trunc('day', created_at)` sobre un `timestamptz` usa el
 * `TimeZone` de la sesión de Postgres —que no se controla desde acá— y las
 * claves se desalinearían con las que genera `modules/dashboard/lib/series.ts`,
 * que son UTC. Un desalineo no da error: el merge simplemente pierde los puntos.
 *
 * Es una sola instancia para que SELECT, GROUP BY y ORDER BY emitan exactamente
 * el mismo texto SQL.
 */
const utcDay = sql<string>`to_char(${orders.createdAt} at time zone 'UTC', 'YYYY-MM-DD')`;

export const dashboardRepository = {
  /**
   * Total cobrado por día civil UTC desde `since`, inclusive. La ventana la
   * resuelve quien llama: este repositorio solo filtra y agrupa.
   *
   * La agregación pasa en Postgres: traer las órdenes para sumarlas en JS
   * crecería con el volumen de ventas, que es justo lo que el widget mide.
   *
   * Los días sin órdenes pagadas no salen en el resultado —no hay filas que
   * agrupar— y los rellena `fillSalesByDay()`.
   */
  async sumPaidTotalsByDay(
    since: Date,
    db: Db | Tx = getDb(),
  ): Promise<DailyPaidTotal[]> {
    const rows = await db
      .select({ day: utcDay, totalCents: sum(orders.totalCents) })
      .from(orders)
      .where(and(eq(orders.status, "paid"), gte(orders.createdAt, since)))
      .groupBy(utcDay)
      .orderBy(asc(utcDay));

    // `sum()` de Drizzle devuelve `string | null` (bigint de Postgres); el
    // casteo se hace acá para que arriba no circule un importe en texto.
    return rows.map((row) => ({
      day: row.day,
      totalCents: Number(row.totalCents ?? 0),
    }));
  },

  /**
   * Órdenes por estado. Devuelve solo los estados presentes en los datos; los
   * que falten los completa en cero `fillOrdersByStatus()`.
   */
  async countOrdersByStatus(
    db: Db | Tx = getDb(),
  ): Promise<OrdersStatusCount[]> {
    return db
      .select({ status: orders.status, total: count() })
      .from(orders)
      .groupBy(orders.status);
  },

  /**
   * Productos activos con `stock <= threshold`, los más críticos primero.
   * `deleted_at is null` va en el WHERE porque el borrado de productos es
   * lógico: sin ese filtro el widget pediría reponer stock de productos que ya
   * no existen para la tienda.
   *
   * El `limit` acota la respuesta y el orden garantiza que lo recortado sea
   * siempre lo menos urgente; el desempate por nombre hace que ese recorte sea
   * estable entre refrescos.
   */
  async findLowStockProducts(
    threshold: number,
    limit: number,
    db: Db | Tx = getDb(),
  ): Promise<LowStockProductRow[]> {
    return db
      .select({
        id: products.id,
        name: products.name,
        sku: products.sku,
        stock: products.stock,
      })
      .from(products)
      .where(
        and(
          lte(products.stock, threshold),
          eq(products.isActive, true),
          isNull(products.deletedAt),
        ),
      )
      .orderBy(asc(products.stock), asc(products.name))
      .limit(limit);
  },
};
