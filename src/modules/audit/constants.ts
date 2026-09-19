import type { AuditLogQueryInput } from "./schemas/audit-log.schema";
import type { AuditSeverity } from "./types/audit-log";

export const DEFAULT_PAGE_SIZE = 20;

export const PAGE_SIZE_OPTIONS = [20, 50, 100] as const;

// Ventana de las métricas de auditoría. La consume el Route Handler de
// `/api/admin/metrics` y también la etiqueta que se muestra en pantalla.
export const METRICS_WINDOW_DAYS = 30;

// Valor centinela de los selects: `Select` de Radix no admite `value=""`, así
// que "sin filtro" necesita un literal propio.
export const ALL_FILTER_VALUE = "all";

export const auditKeys = {
  all: ["audit-logs"] as const,
  lists: () => [...auditKeys.all, "list"] as const,
  list: (params: AuditLogQueryInput) =>
    [...auditKeys.lists(), params] as const,
};

export const metricsKeys = {
  all: ["metrics"] as const,
  summary: () => [...metricsKeys.all, "summary"] as const,
};

// El registro guarda `entity_type` y `action` como texto libre para no atarse a
// un enum de BD por cada módulo nuevo. Estas etiquetas son la traducción a
// lenguaje humano; lo que no esté aquí cae al valor crudo, que solo pasaría con
// una acción registrada después de esta pantalla.
const ENTITY_TYPE_LABELS: Record<string, string> = {
  user: "Usuario",
  role: "Rol",
  category: "Categoría",
  product: "Producto",
};

export function entityTypeLabel(entityType: string): string {
  return ENTITY_TYPE_LABELS[entityType] ?? entityType;
}

const ACTION_LABELS: Record<string, string> = {
  "user.invited": "Usuario invitado",
  "user.role_changed": "Rol de usuario cambiado",
  "user.activated": "Usuario activado",
  "user.deactivated": "Usuario desactivado",
  "role.permissions_updated": "Permisos de rol actualizados",
};

export function actionLabel(action: string): string {
  return ACTION_LABELS[action] ?? action;
}

const SEVERITY_LABELS: Record<AuditSeverity, string> = {
  info: "Información",
  warning: "Advertencia",
  error: "Error",
};

export function severityLabel(severity: AuditSeverity): string {
  return SEVERITY_LABELS[severity];
}

// Claves que aparecen dentro de `changes`/`metadata`. Misma regla: sin
// traducción se muestra la clave tal cual, nunca se inventa contenido.
const FIELD_LABELS: Record<string, string> = {
  permissions: "Permisos",
  roleSlug: "Rol",
  roleId: "Rol",
  roleName: "Rol",
  email: "Correo",
  isActive: "Activo",
  invitationId: "Invitación",
  previousRoleSlug: "Rol anterior",
  clerkId: "Identificador de Clerk",
};

export function fieldLabel(field: string): string {
  return FIELD_LABELS[field] ?? field;
}

export const ENTITY_TYPE_OPTIONS = [
  { value: ALL_FILTER_VALUE, label: "Todas las entidades" },
  { value: "user", label: ENTITY_TYPE_LABELS.user },
  { value: "role", label: ENTITY_TYPE_LABELS.role },
] as const;

export const ACTION_OPTIONS = [
  { value: ALL_FILTER_VALUE, label: "Todas las acciones" },
  ...Object.entries(ACTION_LABELS).map(([value, label]) => ({ value, label })),
] as const;
