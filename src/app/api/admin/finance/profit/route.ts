import { handleApiError } from "@/lib/api-error";
import { PERMISSIONS, requirePermission } from "@/lib/permissions";
import { BREAKDOWN_LIMIT } from "@/modules/finance/constants";
import {
  cogsOrUnknown,
  fillProfitByDay,
  profitCents,
} from "@/modules/finance/lib/profit";
import { storeDaysInRange } from "@/modules/finance/lib/revenue-series";
import {
  netFromGrossCents,
  taxFromGrossCents,
} from "@/modules/finance/lib/tax";
import {
  currentMonthRange,
  rangeToInstants,
} from "@/modules/orders/lib/date-range";
import { orderHistoryQuerySchema } from "@/modules/orders/schemas/order-history.schema";
import { expenseRepository } from "@/server/repositories/expense.repository";
import {
  financeRepository,
  revenueScope,
} from "@/server/repositories/finance.repository";

import type { ProfitReport } from "@/modules/finance/types/profit";

/**
 * P&L del panel de Finanzas. Solo lectura: sin `logAudit()`.
 *
 * El permiso va antes que la validación. La query es solo `from`/`to`, así que
 * se valida con `orderHistoryQuerySchema` tal cual; el mes en curso por defecto
 * se resuelve acá, no en el schema, que no lee el reloj.
 *
 * Ventas y COGS comparten el `revenueScope` de Ingresos (solo `paid`, intervalo
 * semiabierto de instantes). Los egresos no: `expense_date` ya es un día civil y
 * se filtra por los strings del rango, ambos extremos incluidos.
 *
 * El neto se deriva una sola vez por bucket ya sumado (total, día, fila). La
 * utilidad es `neto − COGS − egresos`: el IGV ya salió al derivar el neto y va
 * en `totals` solo como referencia.
 */
export async function GET(request: Request) {
  try {
    await requirePermission(PERMISSIONS.PROFIT_VIEW);

    const { searchParams } = new URL(request.url);
    const query = orderHistoryQuerySchema.parse(
      Object.fromEntries(searchParams.entries()),
    );

    const range =
      query.from !== undefined && query.to !== undefined
        ? { from: query.from, to: query.to }
        : currentMonthRange();

    const { fromInstant, toInstant } = rangeToInstants(range.from, range.to);
    const scope = revenueScope(fromInstant, toInstant);

    const [
      revenueTotals,
      grossByDay,
      cogsTotals,
      cogsByDay,
      productRows,
      expenseTotals,
      expensesByDay,
    ] = await Promise.all([
      financeRepository.sumRevenueTotals(scope),
      financeRepository.sumRevenueByDay(scope),
      financeRepository.sumCogsTotals(scope),
      financeRepository.sumCogsByDay(scope),
      financeRepository.sumProfitByProduct(scope, BREAKDOWN_LIMIT),
      expenseRepository.sumExpenseTotals(range.from, range.to),
      expenseRepository.sumExpensesByDay(range.from, range.to),
    ]);

    const netCents = netFromGrossCents(revenueTotals.grossCents);

    const report: ProfitReport = {
      range,
      totals: {
        grossCents: revenueTotals.grossCents,
        netCents,
        taxCents: taxFromGrossCents(revenueTotals.grossCents),
        cogsCents: cogsTotals.cogsCents,
        expensesCents: expenseTotals.expensesCents,
        profitCents: profitCents(
          netCents,
          cogsTotals.cogsCents,
          expenseTotals.expensesCents,
        ),
        unitsWithoutCost: cogsTotals.unitsWithoutCost,
      },
      daily: fillProfitByDay(
        storeDaysInRange(range.from, range.to),
        grossByDay,
        cogsByDay,
        expensesByDay,
      ),
      byProduct: productRows.map((row) => ({
        id: row.id,
        label: row.label,
        units: row.units,
        netCents: netFromGrossCents(row.grossCents),
        cogsCents: cogsOrUnknown(
          row.cogsCents,
          row.units,
          row.unitsWithoutCost,
        ),
        unitsWithoutCost: row.unitsWithoutCost,
      })),
    };

    return Response.json(report, {
      // Datos financieros de administración: nunca en una caché compartida.
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error: unknown) {
    return handleApiError(error);
  }
}
