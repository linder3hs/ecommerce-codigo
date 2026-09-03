import { handleApiError } from "@/lib/api-error";
import { PERMISSIONS, requirePermission } from "@/lib/permissions";
import { auditLogQuerySchema } from "@/modules/audit/schemas/audit-log.schema";
import { auditRepository } from "@/server/repositories/audit.repository";

import type { PageMeta } from "@/types/api";

/**
 * `audit_logs` es append-only (regla dura #9): este archivo expone SOLO `GET`.
 * No hay `POST`, `PUT`, `PATCH` ni `DELETE`, ni siquiera devolviendo 405 — que
 * el método no exista es la garantía estructural de que no hay ningún punto de
 * escritura al que llamar desde la API. El único escritor de la tabla es
 * `logAudit()`, dentro de la transacción de la mutación que audita.
 */
export async function GET(request: Request) {
  try {
    await requirePermission(PERMISSIONS.AUDIT_LOGS_READ);

    const { searchParams } = new URL(request.url);
    const params = auditLogQuerySchema.parse(
      Object.fromEntries(searchParams.entries()),
    );

    // El actor de cada fila lo resuelve el repositorio con un solo leftJoin, y
    // la paginación es LIMIT/OFFSET en Postgres: nunca se trae la tabla entera.
    const { rows, total } = await auditRepository.list(params);

    const meta: PageMeta = {
      page: params.page,
      pageSize: params.pageSize,
      total,
      totalPages: Math.ceil(total / params.pageSize),
    };

    return Response.json({ data: rows, meta });
  } catch (error: unknown) {
    return handleApiError(error);
  }
}
