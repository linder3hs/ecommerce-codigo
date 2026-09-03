import { handleApiError, jsonError, NotFoundError } from "@/lib/api-error";
import { logAudit } from "@/lib/audit";
import { getCurrentAppUser } from "@/lib/auth";
import { PERMISSIONS, requirePermission } from "@/lib/permissions";
import {
  roleIdSchema,
  updateRolePermissionsSchema,
} from "@/modules/roles/schemas/role.schema";
import { getDb } from "@/server/db";
import { permissionRepository } from "@/server/repositories/permission.repository";
import { roleRepository } from "@/server/repositories/role.repository";

import type { PermissionRow } from "@/server/repositories/permission.repository";

const ROLE_NOT_FOUND_MESSAGE = "El rol no existe.";

const SUPER_ADMIN_SLUG = "super_admin";

const SUPER_ADMIN_REQUIRED_CODES: readonly string[] = [
  PERMISSIONS.PANEL_ACCESS,
  PERMISSIONS.ROLES_MANAGE_PERMISSIONS,
  PERMISSIONS.USERS_ASSIGN_PRIVILEGED_ROLE,
];

/**
 * Guardarraíl de integridad del registro que se muta, no autorización: quién
 * puede llamar a este endpoint lo decide `requirePermission`. Aquí se comprueba
 * la forma del payload sobre `super_admin`, porque sin `panel.access` nadie
 * podría volver a entrar a `/admin` a deshacerlo, y sin los otros dos la matriz
 * quedaría congelada para siempre.
 */
function missingSuperAdminPermissions(
  roleSlug: string,
  nextPermissionIds: ReadonlySet<string>,
  catalog: readonly PermissionRow[],
): PermissionRow[] {
  if (roleSlug !== SUPER_ADMIN_SLUG) {
    return [];
  }

  return catalog.filter(
    (permission) =>
      SUPER_ADMIN_REQUIRED_CODES.includes(permission.code) &&
      !nextPermissionIds.has(permission.id),
  );
}

export async function PATCH(
  request: Request,
  ctx: RouteContext<"/api/admin/roles/[id]/permissions">,
) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return jsonError(400, "El cuerpo de la petición no es JSON válido.");
  }

  try {
    await requirePermission(PERMISSIONS.ROLES_MANAGE_PERMISSIONS);

    const roleId = roleIdSchema.parse((await ctx.params).id);
    const { permissionIds } = updateRolePermissionsSchema.parse(body);

    const [rolesWithPermissions, catalog, actor] = await Promise.all([
      roleRepository.listWithPermissions(),
      permissionRepository.listAll(),
      getCurrentAppUser(),
    ]);

    const role = rolesWithPermissions.find((item) => item.id === roleId);

    if (!role) {
      throw new NotFoundError(ROLE_NOT_FOUND_MESSAGE);
    }

    // El payload puede traer ids repetidos y el pivote tiene PK compuesta: una
    // inserción duplicada reventaría con 23505.
    const requestedIds = new Set(permissionIds);
    const nextPermissions = catalog.filter((permission) =>
      requestedIds.has(permission.id),
    );

    if (nextPermissions.length !== requestedIds.size) {
      return jsonError(
        400,
        "Alguno de los permisos enviados no existe en el catálogo.",
      );
    }

    const missing = missingSuperAdminPermissions(
      role.slug,
      requestedIds,
      catalog,
    );

    if (missing.length > 0) {
      const detail = missing
        .map((permission) => permission.description ?? permission.code)
        .join(" · ");

      return jsonError(
        400,
        `El rol ${role.name} no puede quedarse sin estos permisos: ${detail}`,
      );
    }

    const beforeCodes = role.permissions.map((permission) => permission.code);
    const afterCodes = nextPermissions.map((permission) => permission.code);

    // Regla dura #9: el reemplazo y su registro de auditoría viajan en la misma
    // transacción, o no ocurre ninguno de los dos.
    await getDb().transaction(async (tx) => {
      await roleRepository.replacePermissions(
        roleId,
        nextPermissions.map((permission) => permission.id),
        tx,
      );

      await logAudit(tx, {
        action: "role.permissions_updated",
        entityType: "role",
        entityId: roleId,
        actorId: actor?.id ?? null,
        changes: {
          before: { permissions: beforeCodes },
          after: { permissions: afterCodes },
        },
        metadata: { roleSlug: role.slug },
      });
    });

    return Response.json({ ...role, permissions: nextPermissions });
  } catch (error: unknown) {
    return handleApiError(error);
  }
}
