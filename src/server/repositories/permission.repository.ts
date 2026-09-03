import "server-only";

import { and, asc, eq, inArray } from "drizzle-orm";

import { getDb, type Db, type Tx } from "@/server/db";
import { permissions } from "@/server/db/schema/permission";
import { rolePermissions } from "@/server/db/schema/role-permission";
import { users } from "@/server/db/schema/user";
import { userRoles } from "@/server/db/schema/user-role";

import type { InferSelectModel } from "drizzle-orm";

export type PermissionRow = InferSelectModel<typeof permissions>;

// `permissions` es tabla semilla: nace de `db:seed`, no se crea ni se edita
// desde la aplicación. Este repositorio es de solo lectura a propósito.
export const permissionRepository = {
  async listAll(db: Db | Tx = getDb()): Promise<PermissionRow[]> {
    return db
      .select()
      .from(permissions)
      .orderBy(asc(permissions.resource), asc(permissions.action));
  },

  async findByCodes(
    codes: string[],
    db: Db | Tx = getDb(),
  ): Promise<PermissionRow[]> {
    if (codes.length === 0) {
      return [];
    }

    return db
      .select()
      .from(permissions)
      .where(inArray(permissions.code, codes));
  },

  // Permisos efectivos de un usuario en UNA sola consulta:
  // users ⋈ user_roles ⋈ role_permissions ⋈ permissions. Resolverlo en tres
  // viajes separados sería N+1 en el camino caliente (cada navegación al panel
  // y cada request mutante). Sin filas en `user_roles` devuelve `[]`: ese es el
  // `customer` por defecto, y quien le da sentido es `getEffectivePermissions()`.
  // Un usuario desactivado no conserva permisos, de ahí el `is_active`.
  async findCodesByClerkId(
    clerkId: string,
    db: Db | Tx = getDb(),
  ): Promise<string[]> {
    const rows = await db
      .selectDistinct({ code: permissions.code })
      .from(users)
      .innerJoin(userRoles, eq(userRoles.userId, users.id))
      .innerJoin(rolePermissions, eq(rolePermissions.roleId, userRoles.roleId))
      .innerJoin(permissions, eq(permissions.id, rolePermissions.permissionId))
      .where(and(eq(users.clerkId, clerkId), eq(users.isActive, true)));

    return rows.map((row) => row.code);
  },
};
