import { handleApiError } from "@/lib/api-error";
import { PERMISSIONS, requirePermission } from "@/lib/permissions";
import { METRICS_WINDOW_DAYS } from "@/modules/audit/constants";
import { auditRepository } from "@/server/repositories/audit.repository";
import { userRepository } from "@/server/repositories/user.repository";

import type { MetricsSummary } from "@/modules/audit/types/metrics";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Resumen de conteos para el panel. Todo se agrega en Postgres con `count` +
 * `group by`: son a lo sumo tres consultas que devuelven una fila por grupo,
 * nunca las filas de `users` ni de `audit_logs`.
 */
export async function GET() {
  try {
    await requirePermission(PERMISSIONS.METRICS_READ);

    const since = new Date(Date.now() - METRICS_WINDOW_DAYS * MS_PER_DAY);

    const [byRole, status, bySeverity] = await Promise.all([
      userRepository.countByRole(),
      userRepository.countByStatus(),
      auditRepository.countBySeverity(since),
    ]);

    // Suma sobre a lo sumo tres filas ya agregadas por la BD, no sobre el log.
    const auditTotal = bySeverity.reduce((sum, row) => sum + row.total, 0);

    const summary: MetricsSummary = {
      users: {
        total: status.active + status.inactive,
        active: status.active,
        inactive: status.inactive,
        byRole,
      },
      auditLogs: {
        windowDays: METRICS_WINDOW_DAYS,
        since: since.toISOString(),
        total: auditTotal,
        bySeverity,
      },
    };

    return Response.json(summary);
  } catch (error: unknown) {
    return handleApiError(error);
  }
}
