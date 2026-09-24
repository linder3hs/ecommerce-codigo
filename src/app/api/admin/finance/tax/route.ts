import { handleApiError } from "@/lib/api-error";
import { PERMISSIONS, requirePermission } from "@/lib/permissions";
import {
  IGV_PERCENT,
  netFromGrossCents,
  taxFromGrossCents,
} from "@/modules/finance/lib/tax";
import { bucketTaxByPeriod } from "@/modules/finance/lib/tax-periods";
import { taxQuerySchema } from "@/modules/finance/schemas/tax-report.schema";
import {
  currentMonthRange,
  rangeToInstants,
  todayInStore,
} from "@/modules/orders/lib/date-range";
import {
  financeRepository,
  revenueScope,
} from "@/server/repositories/finance.repository";

import type { TaxReport } from "@/modules/finance/types/tax";

/**
 * Reporte de IGV (débito fiscal) del panel de Finanzas. Solo lectura: sin
 * `logAudit()`.
 *
 * El permiso va antes que la validación: sin él no se gasta ni un parseo. El
 * rango por defecto (mes en curso) se resuelve acá y no en el schema, que no
 * lee el reloj.
 *
 * Una sola consulta —el bruto por día de `revenueScope`, la misma definición
 * de venta que Ingresos— y todo lo demás se deriva en memoria: el total sale del
 * mismo array que las filas, así que reconcilia por construcción.
 */
export async function GET(request: Request) {
  try {
    await requirePermission(PERMISSIONS.TAX_VIEW);

    const { searchParams } = new URL(request.url);
    const query = taxQuerySchema.parse(
      Object.fromEntries(searchParams.entries()),
    );

    const range =
      query.from !== undefined && query.to !== undefined
        ? { from: query.from, to: query.to }
        : currentMonthRange();

    const { fromInstant, toInstant } = rangeToInstants(range.from, range.to);
    const grossByDay = await financeRepository.sumRevenueByDay(
      revenueScope(fromInstant, toInstant),
    );

    const periods = bucketTaxByPeriod(
      range.from,
      range.to,
      query.period,
      grossByDay,
      todayInStore(),
    );
    const grossCents = periods.reduce((sum, row) => sum + row.grossCents, 0);

    const report: TaxReport = {
      range,
      period: query.period,
      ratePercent: IGV_PERCENT,
      totals: {
        grossCents,
        // Del bruto total y no de sumar columnas: neto e IGV no son sumables.
        netCents: netFromGrossCents(grossCents),
        taxCents: taxFromGrossCents(grossCents),
      },
      periods,
    };

    return Response.json(report, {
      // Datos financieros de administración: nunca en una caché compartida.
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error: unknown) {
    return handleApiError(error);
  }
}
