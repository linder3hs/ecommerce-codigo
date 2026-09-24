import "server-only";

import { ForbiddenError } from "@/lib/api-error";
import { requireAuth } from "@/lib/auth";
import { permissionRepository } from "@/server/repositories/permission.repository";

/**
 * Catálogo cerrado de permisos, espejo exacto de `PERMISSION_SEEDS` en
 * `src/server/db/seed.ts`. Los códigos se escriben aquí una vez para que nadie
 * los teclee sueltos en un handler: un typo en un string sería un endpoint sin
 * gate real.
 */
export const PERMISSIONS = {
  PANEL_ACCESS: "panel.access",
  CATEGORIES_CREATE: "categories.create",
  CATEGORIES_READ: "categories.read",
  CATEGORIES_UPDATE: "categories.update",
  CATEGORIES_DELETE: "categories.delete",
  PRODUCTS_CREATE: "products.create",
  PRODUCTS_READ: "products.read",
  PRODUCTS_UPDATE: "products.update",
  PRODUCTS_DELETE: "products.delete",
  ORDERS_READ: "orders.read",
  ORDERS_UPDATE_STATUS: "orders.update_status",
  USERS_READ: "users.read",
  USERS_CREATE: "users.create",
  USERS_UPDATE: "users.update",
  USERS_DEACTIVATE: "users.deactivate",
  USERS_ASSIGN_PRIVILEGED_ROLE: "users.assign_privileged_role",
  ROLES_READ: "roles.read",
  ROLES_MANAGE_PERMISSIONS: "roles.manage_permissions",
  AUDIT_LOGS_READ: "audit_logs.read",
  METRICS_READ: "metrics.read",
  PRODUCT_COST_VIEW: "product_cost.view",
  PRODUCT_COST_UPDATE: "product_cost.update",
  REVENUE_VIEW: "revenue.view",
  EXPENSES_VIEW: "expenses.view",
  EXPENSES_CREATE: "expenses.create",
  EXPENSES_UPDATE: "expenses.update",
  EXPENSES_DELETE: "expenses.delete",
  TAX_VIEW: "tax.view",
  PROFIT_VIEW: "profit.view",
} as const;

export type PermissionCode = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

const KNOWN_CODES = new Set<string>(Object.values(PERMISSIONS));

function isPermissionCode(code: string): code is PermissionCode {
  return KNOWN_CODES.has(code);
}

// Roles que solo puede tocar quien tenga `users.assign_privileged_role`. Es una
// propiedad del usuario OBJETIVO, no del actor: la autorización del actor sigue
// siendo por código de permiso, nunca por su slug de rol.
const PRIVILEGED_ROLE_SLUGS = new Set<string>(["admin", "super_admin"]);

/**
 * Permisos efectivos de un usuario de Clerk. Una sola consulta con joins.
 *
 * Un usuario sin filas en `user_roles` devuelve `[]`: ese es el `customer` por
 * defecto y este es el único lugar del servidor donde vive ese default. No hay
 * que confundirlo con "puede entrar al panel": la llave del panel es
 * `panel.access`, no un set no vacío.
 */
export async function getEffectivePermissions(
  clerkId: string,
): Promise<PermissionCode[]> {
  const codes = await permissionRepository.findCodesByClerkId(clerkId);

  // Un código en BD fuera del catálogo del código no gatea nada: filtrarlo
  // mantiene el tipo honesto en lugar de arrastrar `string` por toda la app.
  return codes.filter(isPermissionCode);
}

export function hasPermission(
  permissions: readonly PermissionCode[],
  code: PermissionCode,
): boolean {
  return permissions.includes(code);
}

/**
 * Gate de autorización de los Route Handlers: 401 sin sesión, 403 sin el
 * permiso. Devuelve el set efectivo del actor para que quien necesite decidir
 * algo más (por ejemplo `assertCanManageTargetUser`) no repita la consulta.
 */
export async function requirePermission(
  code: PermissionCode,
): Promise<PermissionCode[]> {
  const clerkId = await requireAuth();
  const permissions = await getEffectivePermissions(clerkId);

  if (!hasPermission(permissions, code)) {
    throw new ForbiddenError();
  }

  return permissions;
}

/**
 * Escalada de privilegios: administrar a un usuario `admin`/`super_admin` —o
 * promover a alguien a esos roles— exige `users.assign_privileged_role`. Sin
 * esto, un `admin` con `users.update` podría ascenderse a sí mismo.
 *
 * `targetRoleSlug` es el rol actual del objetivo (`null` si no tiene ninguno) y
 * `newRoleSlug` el que se le quiere asignar; ambos se comparan porque describen
 * al objetivo, no a quien ejecuta.
 */
export function assertCanManageTargetUser(
  actorPermissions: readonly PermissionCode[],
  targetRoleSlug: string | null,
  newRoleSlug?: string | null,
): void {
  if (
    hasPermission(actorPermissions, PERMISSIONS.USERS_ASSIGN_PRIVILEGED_ROLE)
  ) {
    return;
  }

  const touchesPrivilegedRole =
    (targetRoleSlug !== null && PRIVILEGED_ROLE_SLUGS.has(targetRoleSlug)) ||
    (newRoleSlug != null && PRIVILEGED_ROLE_SLUGS.has(newRoleSlug));

  if (touchesPrivilegedRole) {
    throw new ForbiddenError(
      "No tienes permiso para administrar usuarios con rol privilegiado.",
    );
  }
}
