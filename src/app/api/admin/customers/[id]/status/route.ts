import { handleApiError, jsonError, NotFoundError } from "@/lib/api-error";
import { logAudit } from "@/lib/audit";
import { getCurrentAppUser } from "@/lib/auth";
import {
  assertCanManageTargetUser,
  PERMISSIONS,
  requirePermission,
} from "@/lib/permissions";
import {
  updateUserStatusSchema,
  userIdSchema,
} from "@/modules/customers/schemas/user.schema";
import { getDb } from "@/server/db";
import { userRepository } from "@/server/repositories/user.repository";

/**
 * Activa o desactiva el acceso local de un usuario. No borra: `audit_logs` y
 * `user_roles` cuelgan de `users.id` y la traza no puede desaparecer.
 */
export async function PATCH(
  request: Request,
  ctx: RouteContext<"/api/admin/customers/[id]/status">,
) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return jsonError(400, "El cuerpo de la petición no es JSON válido.");
  }

  try {
    const actorPermissions = await requirePermission(
      PERMISSIONS.USERS_DEACTIVATE,
    );

    const userId = userIdSchema.parse((await ctx.params).id);
    const { isActive } = updateUserStatusSchema.parse(body);

    const [target, actor] = await Promise.all([
      userRepository.findByIdWithRole(userId),
      getCurrentAppUser(),
    ]);

    if (!target) {
      throw new NotFoundError("El usuario no existe.");
    }

    // El estado no cambia de rol, así que solo importa el rol actual del
    // objetivo: sin `users.assign_privileged_role` no se toca a un privilegiado.
    assertCanManageTargetUser(actorPermissions, target.role?.slug ?? null);

    // Regla dura #9: cambio de estado y registro de auditoría en la misma
    // transacción.
    await getDb().transaction(async (tx) => {
      const updated = await userRepository.setActive(target.id, isActive, tx);

      if (!updated) {
        throw new NotFoundError("El usuario no existe.");
      }

      await logAudit(tx, {
        action: isActive ? "user.activated" : "user.deactivated",
        entityType: "user",
        entityId: target.id,
        actorId: actor?.id ?? null,
        changes: {
          before: { isActive: target.isActive },
          after: { isActive },
        },
        severity: "warning",
      });
    });

    return Response.json({ ...target, isActive });
  } catch (error: unknown) {
    return handleApiError(error);
  }
}
