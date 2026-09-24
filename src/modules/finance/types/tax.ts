import type { taxPeriodSchema } from "../schemas/tax-report.schema";
import type { DateRange } from "@/modules/orders/types/order-history";
import type { z } from "zod";

/** Periodicidad del reporte: `month` o `quarter`. */
export type TaxPeriod = z.infer<typeof taxPeriodSchema>;

/**
 * Un mes o trimestre del calendario de la tienda. Solo el bruto es una suma:
 * neto e IGV se derivan de él con `lib/tax.ts`, así que
 * `netCents + taxCents === grossCents` en cada fila.
 */
export type TaxPeriodRow = {
  /** `2026-09` para un mes, `2026-Q3` para un trimestre. */
  key: string;
  label: string;
  /**
   * Límites de calendario del periodo completo, no su cruce con el rango: si el
   * rango lo recorta, eso lo dice `partial`.
   */
  from: string;
  to: string;
  /** El rango lo recorta o el periodo todavía no ha cerrado: no es declarable. */
  partial: boolean;
  grossCents: number;
  netCents: number;
  taxCents: number;
};

/** Totales del rango, derivados del bruto total y no de sumar columnas. */
export type TaxTotals = Pick<
  TaxPeriodRow,
  "grossCents" | "netCents" | "taxCents"
>;

/**
 * Respuesta de `GET /api/admin/finance/tax`. Débito fiscal informativo: no
 * resta crédito fiscal ni notas de crédito. Todo el cálculo pasa en el
 * servidor: el cliente solo formatea.
 *
 * Neto e IGV no son sumables: `Σ periods.taxCents` puede diferir de
 * `totals.taxCents` en centavos, porque cada bucket se redondea una sola vez.
 * La UI no suma columnas.
 */
export type TaxReport = {
  /** El rango efectivamente consultado: sin `from`/`to` la API resuelve el mes en curso. */
  range: DateRange;
  period: TaxPeriod;
  ratePercent: number;
  totals: TaxTotals;
  /** Todo mes o trimestre que intersecta el rango, en orden cronológico y con 0 si no hubo ventas. */
  periods: TaxPeriodRow[];
};
