import "server-only";

import { asc, eq } from "drizzle-orm";

import { getDb, type Db, type Tx } from "@/server/db";
import { permissions } from "@/server/db/schema/permission";
import { roles } from "@/server/db/schema/role";
import { rolePermissions } from "@/server/db/schema/role-permission";
import { userRoles } from "@/server/db/schema/user-role";

import type { PermissionRow } from "./permission.repository";
import type { InferSelectModel } from "drizzle-orm";

export type RoleRow = InferSelectModel<typeof roles>;

export type RoleWithPermissions = RoleRow & {
  permissions: PermissionRow[];
};

export type AssignRoleData = {
  userId: string;
  roleId: string;
  assignedBy: string | null;
};

export const roleRepository = {
  // Un solo leftJoin trae roles y permisos juntos y se agrupa en memoria: la
  // alternativa sería una consulta de permisos por rol (N+1).
  async listWithPermissions(
    db: Db | Tx = getDb(),
  ): Promise<RoleWithPermissions[]> {
    const rows = await db
      .select({ role: roles, permission: permissions })
      .from(roles)
      .leftJoin(rolePermissions, eq(rolePermissions.roleId, roles.id))
      .leftJoin(permissions, eq(permissions.id, rolePermissions.permissionId))
      .orderBy(asc(roles.name), asc(permissions.code));

    const grouped = new Map<string, RoleWithPermissions>();

    for (const row of rows) {
      const current = grouped.get(row.role.id) ?? {
        ...row.role,
        permissions: [],
      };

      if (row.permission) {
        current.permissions.push(row.permission);
      }

      grouped.set(row.role.id, current);
    }

    return [...grouped.values()];
  },

  // Rol propio de un usuario. Un usuario tiene como mucho un rol en este
  // dominio (ver `assignToUser`), de ahí el `limit(1)`. Devolver `null` no
  // significa "sin permisos por defecto": ese default lo resuelve
  // `getEffectivePermissions()`.
  async findByUserId(
    userId: string,
    db: Db | Tx = getDb(),
  ): Promise<RoleRow | null> {
    const [row] = await db
      .select({ role: roles })
      .from(userRoles)
      .innerJoin(roles, eq(roles.id, userRoles.roleId))
      .where(eq(userRoles.userId, userId))
      .limit(1);

    return row?.role ?? null;
  },

  // Los ids de `roles` son aleatorios y cambian entre entornos: el slug es la
  // única referencia estable, y es lo que viaja en la invitación de Clerk.
  async findBySlug(
    slug: string,
    db: Db | Tx = getDb(),
  ): Promise<RoleRow | null> {
    const [row] = await db
      .select()
      .from(roles)
      .where(eq(roles.slug, slug))
      .limit(1);

    return row ?? null;
  },

  async findById(id: string, db: Db | Tx = getDb()): Promise<RoleRow | null> {
    const [row] = await db
      .select()
      .from(roles)
      .where(eq(roles.id, id))
      .limit(1);

    return row ?? null;
  },

  // Reemplazo total del set: borra y reinserta. El llamador debe pasar el `tx`
  // de `db.transaction()` para que esto y su `logAudit` viajen juntos.
  async replacePermissions(
    roleId: string,
    permissionIds: string[],
    db: Db | Tx = getDb(),
  ): Promise<void> {
    await db.delete(rolePermissions).where(eq(rolePermissions.roleId, roleId));

    if (permissionIds.length === 0) {
      return;
    }

    await db
      .insert(rolePermissions)
      .values(permissionIds.map((permissionId) => ({ roleId, permissionId })));
  },

  // Un usuario tiene un solo rol en este dominio: asignar reemplaza lo que
  // hubiera. Igual que arriba, transaccional por cuenta del llamador.
  async assignToUser(
    data: AssignRoleData,
    db: Db | Tx = getDb(),
  ): Promise<void> {
    await db.delete(userRoles).where(eq(userRoles.userId, data.userId));

    await db.insert(userRoles).values({
      userId: data.userId,
      roleId: data.roleId,
      assignedBy: data.assignedBy,
    });
  },
};
