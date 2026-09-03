import { api } from "@/lib/axios";

import type { AuditLogQueryInput } from "../schemas/audit-log.schema";
import type { AuditLogListResponse } from "../types/audit-log";

const RESOURCE = "/admin/audit-logs";

// Solo lectura, como la tabla que consulta: no hay `create`, `update` ni
// `remove` porque el endpoint tampoco los expone.
export const auditLogService = {
  async list(params: AuditLogQueryInput): Promise<AuditLogListResponse> {
    // axios serializa los `Date` de `dateFrom`/`dateTo` como ISO 8601, que es
    // justo lo que `auditLogQuerySchema` vuelve a coercionar en el servidor.
    const { data } = await api.get<AuditLogListResponse>(RESOURCE, { params });

    return data;
  },
};
