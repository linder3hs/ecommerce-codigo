import { handleApiError } from "@/lib/api-error";
import { PERMISSIONS, requirePermission } from "@/lib/permissions";
import { BREAKDOWN_LIMIT } from "@/modules/finance/constants";
import {
  appendOthersRow,
  fillRevenueByDay,
  storeDaysInRange,
} from "@/modules/finance/lib/revenue-series";
import {
  netFromGrossCents,
  taxFromGrossCents,
} from "@/modules/finance/lib/tax";
import { revenueQuerySchema } from "@/modules/finance/schemas/revenue.schema";
import {
  currentMonthRange,
  rangeToInstants,
} from "@/modules/orders/lib/date-range";
import {
  financeRepository,
  revenueScope,
} from "@/server/repositories/finance.repository";

import type { RevenueReport } from "@/modules/finance/types/revenue";

/**
 * Reporte de ingresos del panel de Finanzas. Solo lectura: sin `logAudit()`.
 *
 * El permiso va antes que la validación: sin él no se gasta ni un parseo. El
 * rango por defecto (mes en curso) se resuelve acá y no en el schema, que no
 * lee el reloj.
 *
 * Las tres consultas comparten el mismo scope y corren en paralelo. Todo el
 * cálculo —neto, IGV, relleno de días y fila "Otros"— pasa acá con los libs
 * puros: el cliente solo formatea.
 */
export async function GET(request: Request) {
  try {
    await requirePermission(PERMISSIONS.REVENUE_VIEW);

    const { searchParams } = new URL(request.url);
    const query = revenueQuerySchema.parse(
      Object.fromEntries(searchParams.entries()),
    );

    const range =
      query.from !== undefined && query.to !== undefined
        ? { from: query.from, to: query.to }
        : currentMonthRange();

    const { fromInstant, toInstant } = rangeToInstants(range.from, range.to);
    const scope = revenueScope(fromInstant, toInstant);

    const [totals, grossByDay, topRows] = await Promise.all([
      financeRepository.sumRevenueTotals(scope),
      financeRepository.sumRevenueByDay(scope),
      financeRepository.sumRevenueBreakdown(
        scope,
        query.breakdown,
        BREAKDOWN_LIMIT,
      ),
    ]);

    const report: RevenueReport = {
      range,
      totals: {
        grossCents: totals.grossCents,
        // Del bruto total y no de sumar netos: el neto no es sumable.
        netCents: netFromGrossCents(totals.grossCents),
        taxCents: taxFromGrossCents(totals.grossCents),
        orders: totals.orders,
        units: totals.units,
      },
      daily: fillRevenueByDay(
        storeDaysInRange(range.from, range.to),
        grossByDay,
      ),
      breakdown: appendOthersRow(topRows, totals),
    };

    return Response.json(report, {
      // Datos financieros de administración: nunca en una caché compartida.
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error: unknown) {
    return handleApiError(error);
  }
}
