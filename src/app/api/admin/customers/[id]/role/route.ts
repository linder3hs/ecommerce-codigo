import { handleApiError, jsonError, NotFoundError } from "@/lib/api-error";
import { logAudit } from "@/lib/audit";
import { getCurrentAppUser } from "@/lib/auth";
import {
  assertCanManageTargetUser,
  PERMISSIONS,
  requirePermission,
} from "@/lib/permissions";
import {
  updateUserRoleSchema,
  userIdSchema,
} from "@/modules/customers/schemas/user.schema";
import { getDb } from "@/server/db";
import { roleRepository } from "@/server/repositories/role.repository";
import { userRepository } from "@/server/repositories/user.repository";

/**
 * Asignación de rol. `roleRepository.assignToUser` reemplaza lo que hubiera:
 * un usuario tiene un solo rol en este dominio.
 */
export async function PATCH(
  request: Request,
  ctx: RouteContext<"/api/admin/customers/[id]/role">,
) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return jsonError(400, "El cuerpo de la petición no es JSON válido.");
  }

  try {
    const actorPermissions = await requirePermission(PERMISSIONS.USERS_UPDATE);

    const userId = userIdSchema.parse((await ctx.params).id);
    const { roleId } = updateUserRoleSchema.parse(body);

    const [target, nextRole, actor] = await Promise.all([
      userRepository.findByIdWithRole(userId),
      roleRepository.findById(roleId),
      getCurrentAppUser(),
    ]);

    if (!target) {
      throw new NotFoundError("El usuario no existe.");
    }

    if (!nextRole) {
      throw new NotFoundError("El rol seleccionado no existe.");
    }

    // Único guardarraíl de escalada de privilegios, y vive en `permissions.ts`:
    // 403 si el actor no puede tocar a un usuario privilegiado ni promover a
    // alguien a serlo. Aquí no se comparan slugs de rol a mano.
    assertCanManageTargetUser(
      actorPermissions,
      target.role?.slug ?? null,
      nextRole.slug,
    );

    // Regla dura #9: la asignación y su registro de auditoría viajan en la
    // misma transacción, o no ocurre ninguno de los dos.
    await getDb().transaction(async (tx) => {
      await roleRepository.assignToUser(
        { userId: target.id, roleId: nextRole.id, assignedBy: actor?.id ?? null },
        tx,
      );

      await logAudit(tx, {
        action: "user.role_changed",
        entityType: "user",
        entityId: target.id,
        actorId: actor?.id ?? null,
        changes: {
          before: { role: target.role?.slug ?? null },
          after: { role: nextRole.slug },
        },
        severity: "warning",
      });
    });

    return Response.json({
      ...target,
      role: { id: nextRole.id, slug: nextRole.slug, name: nextRole.name },
    });
  } catch (error: unknown) {
    return handleApiError(error);
  }
}
