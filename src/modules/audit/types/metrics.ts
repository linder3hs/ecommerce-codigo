import type { AuditSeverity } from "./audit-log";

// `roleId` es `null` en el grupo de usuarios sin fila en `user_roles`: son los
// `customer` por defecto, y quien le da ese sentido es
// `getEffectivePermissions()` en el servidor.
export type UsersByRoleMetric = {
  roleId: string | null;
  roleSlug: string | null;
  roleName: string | null;
  total: number;
};

export type AuditSeverityMetric = {
  severity: AuditSeverity;
  total: number;
};

export type MetricsSummary = {
  users: {
    total: number;
    active: number;
    inactive: number;
    byRole: UsersByRoleMetric[];
  };
  auditLogs: {
    // Ventana móvil sobre la que se cuentan las severidades.
    windowDays: number;
    since: string;
    total: number;
    bySeverity: AuditSeverityMetric[];
  };
};
