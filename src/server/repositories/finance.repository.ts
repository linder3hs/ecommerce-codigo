import "server-only";

import {
  asc,
  count,
  desc,
  eq,
  gte,
  inArray,
  lt,
  sql,
  sum,
  type SQL,
} from "drizzle-orm";

// Import de valor desde `modules/` a propósito: `date-range.ts` es un lib puro
// sin dependencias y es el dueño del calendario de la tienda.
import { STORE_TIME_ZONE } from "@/modules/orders/lib/date-range";
import { getDb, type Db, type Tx } from "@/server/db";
import { categories } from "@/server/db/schema/category";
import { orderItems, orders } from "@/server/db/schema/order";
import { products } from "@/server/db/schema/product";

import type { OrderStatus } from "./order.repository";
import type { RevenueBreakdown } from "@/modules/finance/types/revenue";

/**
 * Estados que cuentan como ingreso real. Solo `paid`: una orden `pending` no se
 * cobró y una `payment_failed` no se va a cobrar.
 */
export const REVENUE_ORDER_STATUSES = [
  "paid",
] as const satisfies readonly OrderStatus[];

/**
 * Definición única de "qué cuenta como ingreso" para 017, 019 y 020: órdenes
 * pagadas creadas en `[fromInstant, toInstant)`. El extremo alto es `lt`, nunca
 * `lte`: `rangeToInstants` ya lo entrega como el arranque del día siguiente.
 *
 * La fecha es `created_at` porque el schema no tiene `paid_at` y `updated_at` se
 * reescribe en cada PATCH. Si algún día existe `paid_at`, este es el único
 * cambio.
 *
 * Todas las condiciones van sobre `orders`: las consultas que parten de
 * `order_items` las aplican tras un `innerJoin(orders)`.
 *
 * Se arma con `sql.join` y no con `and()` porque `and()` se tipa
 * `SQL | undefined`, y un scope `undefined` en un `where` quitaría el filtro
 * entero en silencio.
 */
export function revenueScope(fromInstant: Date, toInstant: Date): SQL {
  return sql`(${sql.join(
    [
      inArray(orders.status, REVENUE_ORDER_STATUSES),
      gte(orders.createdAt, fromInstant),
      lt(orders.createdAt, toInstant),
    ],
    sql` and `,
  )})`;
}

/**
 * Día civil de la tienda de una orden, `YYYY-MM-DD`. Las claves coinciden con
 * las de `storeDaysInRange`, que es quien rellena la serie.
 *
 * La zona va como literal SQL y no como parámetro: interpolada, SELECT y GROUP
 * BY llevarían dos binds distintos y Postgres rechazaría la consulta porque las
 * expresiones no son estructuralmente iguales. Es una constante del código, no
 * entrada de usuario. Por lo mismo es una sola instancia reutilizada en SELECT,
 * GROUP BY y ORDER BY.
 */
export const storeDay = sql<string>`to_char(${orders.createdAt} at time zone ${sql.raw(`'${STORE_TIME_ZONE}'`)}, 'YYYY-MM-DD')`;

export type RevenueDayRow = {
  /** Día civil de la tienda, `YYYY-MM-DD`. */
  day: string;
  grossCents: number;
};

export type RevenueTotalsRow = {
  grossCents: number;
  orders: number;
  units: number;
};

export type RevenueBreakdownDbRow = {
  id: string;
  label: string;
  units: number;
  grossCents: number;
};

/**
 * Columnas de agrupado de cada eje del desglose. La etiqueta sale del join y no
 * de `name_snapshot`: agrupar por producto o categoría vivos es lo que pide el
 * reporte, y el snapshot cambiaría de nombre entre ventas del mismo producto.
 */
const BREAKDOWN_COLUMNS = {
  product: { id: products.id, label: products.name },
  category: { id: categories.id, label: categories.name },
} as const satisfies Record<RevenueBreakdown, unknown>;

export type CogsTotalsRow = {
  cogsCents: number;
  /** Unidades de líneas sin costo congelado: fuera del COGS, nunca a costo 0. */
  unitsWithoutCost: number;
};

export type CogsDayRow = {
  /** Día civil de la tienda, `YYYY-MM-DD`. */
  day: string;
  cogsCents: number;
};

export type ProfitProductDbRow = {
  id: string;
  label: string;
  units: number;
  grossCents: number;
  /** Solo líneas con costo: si ninguna lo tiene llega 0 y decide `cogsOrUnknown()`. */
  cogsCents: number;
  unitsWithoutCost: number;
};

/**
 * COGS de las líneas agrupadas. El `filter` es explícito aunque `sum()` ya
 * ignore los productos con `null`: excluir la línea sin costo es una decisión
 * del reporte (Ganancias, AC4), no un efecto de la aritmética. `::bigint` por el
 * mismo desborde que el bruto del desglose.
 */
const cogsSum = sql<
  string | null
>`sum(${orderItems.unitCostCents}::bigint * ${orderItems.qty}) filter (where ${orderItems.unitCostCents} is not null)`;

/** Unidades de las líneas sin costo congelado: se reportan aparte, no como 0. */
const unitsWithoutCostSum = sql<
  string | null
>`sum(${orderItems.qty}) filter (where ${orderItems.unitCostCents} is null)`;

export const financeRepository = {
  /**
   * Bruto por día civil de la tienda dentro del scope. Solo devuelve los días
   * con ventas; el relleno en cero lo hace `fillRevenueByDay()`.
   */
  async sumRevenueByDay(
    scope: SQL,
    db: Db | Tx = getDb(),
  ): Promise<RevenueDayRow[]> {
    const rows = await db
      .select({ day: storeDay, grossCents: sum(orders.totalCents) })
      .from(orders)
      .where(scope)
      .groupBy(storeDay)
      .orderBy(asc(storeDay));

    // `sum()` llega como texto (bigint de Postgres): se castea acá para que
    // arriba no circule un importe en string.
    return rows.map((row) => ({
      day: row.day,
      grossCents: Number(row.grossCents ?? 0),
    }));
  },

  /**
   * Bruto, órdenes y unidades del scope. El bruto y el conteo salen de
   * `orders`; las unidades de `order_items`, con el mismo scope tras el join.
   * Son dos consultas porque sumar `total_cents` después de unir con las líneas
   * lo multiplicaría por su cantidad.
   */
  async sumRevenueTotals(
    scope: SQL,
    db: Db | Tx = getDb(),
  ): Promise<RevenueTotalsRow> {
    const [[orderTotals], [itemTotals]] = await Promise.all([
      db
        .select({ grossCents: sum(orders.totalCents), orders: count() })
        .from(orders)
        .where(scope),
      db
        .select({ units: sum(orderItems.qty) })
        .from(orderItems)
        .innerJoin(orders, eq(orderItems.orderId, orders.id))
        .where(scope),
    ]);

    return {
      grossCents: Number(orderTotals?.grossCents ?? 0),
      orders: orderTotals?.orders ?? 0,
      units: Number(itemTotals?.units ?? 0),
    };
  },

  /**
   * Top `limit` por bruto, agrupado por producto o por categoría. Lo que queda
   * fuera lo resume la fila "Otros" de `appendOthersRow()`.
   *
   * Sin filtro de `deleted_at` ni `is_active` en productos ni categorías: una
   * venta cerrada no desaparece porque su producto se dé de baja (AC6).
   *
   * Siempre une `categories`, también en el eje de producto: `category_id` es
   * `not null` con FK, así que el join no descarta filas y evita armar la
   * consulta de forma condicional.
   *
   * El desempate por etiqueta e id hace que el recorte del top sea estable
   * entre refrescos cuando dos filas empatan en bruto.
   */
  async sumRevenueBreakdown(
    scope: SQL,
    groupBy: RevenueBreakdown,
    limit: number,
    db: Db | Tx = getDb(),
  ): Promise<RevenueBreakdownDbRow[]> {
    const { id, label } = BREAKDOWN_COLUMNS[groupBy];
    // `::bigint` antes de multiplicar: `integer * integer` desborda en
    // Postgres por encima de 2^31 y la línea fallaría en vez de sumarse.
    const grossCents = sum(
      sql`${orderItems.unitPriceCents}::bigint * ${orderItems.qty}`,
    );

    const rows = await db
      .select({
        id: sql<string>`${id}`,
        label: sql<string>`${label}`,
        units: sum(orderItems.qty),
        grossCents,
      })
      .from(orderItems)
      .innerJoin(orders, eq(orderItems.orderId, orders.id))
      .innerJoin(products, eq(orderItems.productId, products.id))
      .innerJoin(categories, eq(products.categoryId, categories.id))
      .where(scope)
      .groupBy(id, label)
      .orderBy(desc(grossCents), asc(label), asc(id))
      .limit(limit);

    return rows.map((row) => ({
      id: row.id,
      label: row.label,
      units: Number(row.units ?? 0),
      grossCents: Number(row.grossCents ?? 0),
    }));
  },

  /**
   * COGS y unidades sin costo de las líneas de las órdenes del scope, en una
   * sola pasada. Parte de `order_items` y aplica el scope tras unir `orders`.
   */
  async sumCogsTotals(
    scope: SQL,
    db: Db | Tx = getDb(),
  ): Promise<CogsTotalsRow> {
    const [row] = await db
      .select({ cogsCents: cogsSum, unitsWithoutCost: unitsWithoutCostSum })
      .from(orderItems)
      .innerJoin(orders, eq(orderItems.orderId, orders.id))
      .where(scope);

    return {
      cogsCents: Number(row?.cogsCents ?? 0),
      unitsWithoutCost: Number(row?.unitsWithoutCost ?? 0),
    };
  },

  /**
   * COGS por día civil de la tienda. Usa la misma instancia `storeDay` que
   * `sumRevenueByDay`: si la clave no coincidiera carácter a carácter, el merge
   * de `fillProfitByDay()` perdería puntos. Solo devuelve días con ventas.
   */
  async sumCogsByDay(scope: SQL, db: Db | Tx = getDb()): Promise<CogsDayRow[]> {
    const rows = await db
      .select({ day: storeDay, cogsCents: cogsSum })
      .from(orderItems)
      .innerJoin(orders, eq(orderItems.orderId, orders.id))
      .where(scope)
      .groupBy(storeDay)
      .orderBy(asc(storeDay));

    return rows.map((row) => ({
      day: row.day,
      cogsCents: Number(row.cogsCents ?? 0),
    }));
  },

  /**
   * Top `limit` productos por bruto de línea, con su COGS y sus unidades sin
   * costo. Sin fila "Otros": el margen de un resto heterogéneo no dice nada.
   *
   * Sin filtro de `deleted_at` ni `is_active`: una venta cerrada no desaparece
   * porque su producto se dé de baja. El desempate por nombre e id mantiene
   * estable el recorte del top entre refrescos.
   */
  async sumProfitByProduct(
    scope: SQL,
    limit: number,
    db: Db | Tx = getDb(),
  ): Promise<ProfitProductDbRow[]> {
    const grossCents = sum(
      sql`${orderItems.unitPriceCents}::bigint * ${orderItems.qty}`,
    );

    const rows = await db
      .select({
        id: products.id,
        label: products.name,
        units: sum(orderItems.qty),
        grossCents,
        cogsCents: cogsSum,
        unitsWithoutCost: unitsWithoutCostSum,
      })
      .from(orderItems)
      .innerJoin(orders, eq(orderItems.orderId, orders.id))
      .innerJoin(products, eq(orderItems.productId, products.id))
      .where(scope)
      .groupBy(products.id, products.name)
      .orderBy(desc(grossCents), asc(products.name), asc(products.id))
      .limit(limit);

    return rows.map((row) => ({
      id: row.id,
      label: row.label,
      units: Number(row.units ?? 0),
      grossCents: Number(row.grossCents ?? 0),
      cogsCents: Number(row.cogsCents ?? 0),
      unitsWithoutCost: Number(row.unitsWithoutCost ?? 0),
    }));
  },
};
