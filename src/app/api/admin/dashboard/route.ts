import { handleApiError } from "@/lib/api-error";
import { PERMISSIONS, requirePermission } from "@/lib/permissions";
import {
  LOW_STOCK_LIMIT,
  LOW_STOCK_THRESHOLD,
  SALES_WINDOW_DAYS,
} from "@/modules/dashboard/constants";
import {
  fillOrdersByStatus,
  fillSalesByDay,
  lastUtcDays,
} from "@/modules/dashboard/lib/series";
import { dashboardMetricsSchema } from "@/modules/dashboard/schemas/dashboard.schema";
import { dashboardRepository } from "@/server/repositories/dashboard.repository";

import type { DashboardMetrics } from "@/modules/dashboard/types/dashboard";

/**
 * Métricas del dashboard admin. Endpoint de solo lectura: no muta nada, así que
 * no hay `logAudit()`. Tampoco recibe query params ni body, de modo que no hay
 * entrada de usuario que validar con Zod; lo que se valida es la **salida**,
 * porque el contrato que el service parsea al otro lado se declara una sola vez
 * en `dashboard.schema.ts`.
 *
 * Las tres consultas son independientes y agregan en Postgres: van en paralelo
 * para que la latencia del widget sea la de la más lenta, no la suma.
 *
 * El relleno de ceros ocurre acá, en el servidor: la respuesta siempre trae 30
 * puntos de venta y los 3 estados de orden, esté o no dibujando alguien.
 */
export async function GET() {
  try {
    await requirePermission(PERMISSIONS.METRICS_READ);

    // Un solo instante para toda la petición: el `since` de la consulta y las
    // claves del relleno tienen que salir del mismo `now`, o una petición que
    // cruce la medianoche UTC entre los dos cálculos pediría una ventana y
    // dibujaría otra.
    const now = new Date();

    // El `since` se deriva del primer día que genera el propio helper de
    // relleno —no de una resta de milisegundos aparte— para que la consulta y
    // la serie hablen exactamente de la misma ventana de días civiles UTC.
    const windowStartDay = lastUtcDays(SALES_WINDOW_DAYS, now)[0];
    const since = new Date(`${windowStartDay}T00:00:00.000Z`);

    const [paidTotalsByDay, statusCounts, lowStock] = await Promise.all([
      dashboardRepository.sumPaidTotalsByDay(since),
      dashboardRepository.countOrdersByStatus(),
      dashboardRepository.findLowStockProducts(
        LOW_STOCK_THRESHOLD,
        LOW_STOCK_LIMIT,
      ),
    ]);

    const metrics: DashboardMetrics = {
      salesByDay: fillSalesByDay(paidTotalsByDay, SALES_WINDOW_DAYS, now),
      ordersByStatus: fillOrdersByStatus(statusCounts),
      lowStock,
      windowDays: SALES_WINDOW_DAYS,
      lowStockThreshold: LOW_STOCK_THRESHOLD,
    };

    const parsed = dashboardMetricsSchema.safeParse(metrics);

    if (!parsed.success) {
      // Una salida que no cumple su propio contrato es un bug del servidor, no
      // una petición mal formada: se lanza un Error común para caer en el 500
      // de `handleApiError` y no en el 400 reservado para `ZodError`, que en un
      // GET sin entrada solo confundiría a quien lea el log.
      throw new Error(
        `La respuesta de /api/admin/dashboard no cumple el contrato: ${parsed.error.message}`,
      );
    }

    return Response.json(parsed.data);
  } catch (error: unknown) {
    return handleApiError(error);
  }
}
