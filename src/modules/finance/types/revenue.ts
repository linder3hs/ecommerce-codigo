import type { revenueBreakdownSchema } from "../schemas/revenue.schema";
import type { DateRange } from "@/modules/orders/types/order-history";
import type { z } from "zod";

/** Eje del desglose: `product` o `category`. */
export type RevenueBreakdown = z.infer<typeof revenueBreakdownSchema>;

/**
 * Totales del rango. Solo el bruto es una suma de la BD: neto e IGV se derivan
 * de él con `lib/tax.ts`, así que `netCents + taxCents === grossCents` siempre.
 */
export type RevenueTotals = {
  grossCents: number;
  netCents: number;
  taxCents: number;
  /** Órdenes pagadas del rango. */
  orders: number;
  /** Unidades vendidas: suma de `qty` de sus líneas. */
  units: number;
};

/** Un día civil de la tienda (`YYYY-MM-DD`). Los días sin ventas vienen en 0. */
export type RevenueDailyPoint = {
  day: string;
  grossCents: number;
  netCents: number;
};

/**
 * Fila del desglose. `id: null` es la fila "Otros": el resto del bruto y de las
 * unidades que no entró en el top, para que la columna bruto reconcilie exacto
 * con los totales.
 */
export type RevenueBreakdownRow = {
  id: string | null;
  label: string;
  units: number;
  grossCents: number;
  netCents: number;
};

/**
 * Respuesta de `GET /api/admin/finance/revenue`. Todo el cálculo pasa en el
 * servidor: el cliente solo formatea.
 *
 * El neto no es sumable: `Σ daily.netCents` y `Σ breakdown.netCents` pueden
 * diferir de `totals.netCents` en un centavo por fila, porque cada bucket se
 * redondea una sola vez. La UI no suma columnas de neto.
 */
export type RevenueReport = {
  /** El rango efectivamente consultado: sin `from`/`to` la API resuelve el mes en curso. */
  range: DateRange;
  totals: RevenueTotals;
  daily: RevenueDailyPoint[];
  breakdown: RevenueBreakdownRow[];
};
