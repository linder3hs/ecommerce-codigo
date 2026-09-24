import type { DateRange } from "@/modules/orders/types/order-history";

/**
 * Totales del P&L del rango, en centavos enteros. Cada importe sale de su
 * propia consulta; `profitCents = netCents − cogsCents − expensesCents`.
 *
 * `taxCents` es referencia: ya quedó fuera al derivar el neto del bruto y no se
 * resta otra vez.
 */
export type ProfitTotals = {
  grossCents: number;
  netCents: number;
  taxCents: number;
  /** Costo de lo vendido, solo de las líneas con costo congelado. */
  cogsCents: number;
  expensesCents: number;
  profitCents: number;
  /** Unidades vendidas cuya línea no tiene costo: excluidas del COGS, no en 0. */
  unitsWithoutCost: number;
};

/** Un día civil de la tienda (`YYYY-MM-DD`). Los días sin movimiento vienen en 0. */
export type ProfitDailyPoint = {
  day: string;
  netCents: number;
  cogsCents: number;
  expensesCents: number;
  profitCents: number;
};

/**
 * Margen bruto de un producto en el rango. `cogsCents: null` cuando **todas**
 * sus líneas son sin costo: no hay dato que sostenga un margen, y un 0 diría
 * que el producto no cuesta nada.
 */
export type ProfitProductRow = {
  id: string;
  label: string;
  units: number;
  netCents: number;
  cogsCents: number | null;
  unitsWithoutCost: number;
};

/**
 * Respuesta de `GET /api/admin/finance/profit`. Todo el cálculo pasa en el
 * servidor; el cliente solo deriva el margen con `lib/margin.ts` y formatea.
 *
 * La utilidad no es sumable: `Σ daily.profitCents` puede diferir de
 * `totals.profitCents` en un centavo por día, porque el neto se redondea una
 * vez por bucket. La UI no suma columnas.
 */
export type ProfitReport = {
  /** El rango efectivamente consultado: sin `from`/`to` la API resuelve el mes en curso. */
  range: DateRange;
  totals: ProfitTotals;
  daily: ProfitDailyPoint[];
  byProduct: ProfitProductRow[];
};
