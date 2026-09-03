import { clerkClient } from "@clerk/nextjs/server";

import { handleApiError, jsonError, NotFoundError } from "@/lib/api-error";
import { logAudit } from "@/lib/audit";
import { getCurrentAppUser } from "@/lib/auth";
import {
  assertCanManageTargetUser,
  PERMISSIONS,
  requirePermission,
} from "@/lib/permissions";
import {
  inviteUserSchema,
  userQuerySchema,
} from "@/modules/customers/schemas/user.schema";
import { getDb } from "@/server/db";
import { roleRepository } from "@/server/repositories/role.repository";
import { userRepository } from "@/server/repositories/user.repository";

import type { PageMeta } from "@/types/api";

// Forma mínima del error que devuelve la API de Clerk. Se comprueba por
// estructura en vez de importar `@clerk/backend`: ese paquete es una
// dependencia transitiva de `@clerk/nextjs`, no una que la app declare.
type ClerkApiErrorLike = {
  status: number;
  errors: { code?: string; message?: string; longMessage?: string }[];
};

function asClerkApiError(error: unknown): ClerkApiErrorLike | null {
  if (typeof error !== "object" || error === null) {
    return null;
  }

  const candidate = error as Partial<ClerkApiErrorLike>;

  return typeof candidate.status === "number" && Array.isArray(candidate.errors)
    ? (candidate as ClerkApiErrorLike)
    : null;
}

export async function GET(request: Request) {
  try {
    await requirePermission(PERMISSIONS.USERS_READ);

    const { searchParams } = new URL(request.url);
    const params = userQuerySchema.parse(
      Object.fromEntries(searchParams.entries()),
    );

    // El rol de cada fila lo resuelve el repositorio con un solo leftJoin: no
    // hay una consulta por usuario.
    const { rows, total } = await userRepository.list(params);

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

/**
 * Alta de usuario por invitación de Clerk, nunca por `createUser`: así no hay
 * contraseñas manuales circulando y la persona elige la suya al aceptar.
 *
 * El rol intencionado viaja en `publicMetadata` de la invitación. El SDK
 * (`@clerk/backend@3.16.12`, `InvitationApi.CreateParams.publicMetadata`) lo
 * documenta explícitamente: "Once the user accepts the invitation and signs up,
 * these metadata will end up in the user's public metadata". Quien lo consume
 * es el webhook `user.created`, que traduce el slug a una fila de `user_roles`.
 */
export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return jsonError(400, "El cuerpo de la petición no es JSON válido.");
  }

  try {
    const actorPermissions = await requirePermission(PERMISSIONS.USERS_CREATE);

    const { email, roleSlug } = inviteUserSchema.parse(body);

    // Invitar con rol privilegiado exige `users.assign_privileged_role`. No hay
    // usuario objetivo todavía, así que el rol actual es `null` y el que se
    // evalúa es el intencionado.
    assertCanManageTargetUser(actorPermissions, null, roleSlug);

    const [role, actor] = await Promise.all([
      roleRepository.findBySlug(roleSlug),
      getCurrentAppUser(),
    ]);

    if (!role) {
      throw new NotFoundError("El rol seleccionado no existe.");
    }

    const client = await clerkClient();

    let invitation;

    try {
      invitation = await client.invitations.createInvitation({
        emailAddress: email,
        publicMetadata: { intendedRoleSlug: role.slug },
        redirectUrl: new URL("/sign-up", request.url).toString(),
      });
    } catch (error: unknown) {
      const clerkError = asClerkApiError(error);

      // Clerk rechaza el correo ya invitado o ya registrado. Se traduce a 409
      // en lugar de dejarlo caer al 500 genérico, que no diría nada útil.
      if (!clerkError) {
        throw error;
      }

      console.error("Clerk rechazó la invitación.", clerkError.errors);

      return jsonError(
        409,
        "No se pudo enviar la invitación: ese correo ya tiene una invitación pendiente o ya pertenece a un usuario.",
      );
    }

    // Nota 5 del spec: la invitación es un efecto externo en Clerk y
    // `audit_logs` es local, así que este punto —y solo este— acepta
    // consistencia eventual. Se registra después de que Clerk confirme.
    await getDb().transaction(async (tx) => {
      await logAudit(tx, {
        action: "user.invited",
        entityType: "user",
        entityId: null,
        actorId: actor?.id ?? null,
        metadata: {
          email,
          roleSlug: role.slug,
          invitationId: invitation.id,
        },
      });
    });

    return Response.json(
      {
        id: invitation.id,
        email: invitation.emailAddress,
        roleSlug: role.slug,
        status: invitation.status,
      },
      { status: 201 },
    );
  } catch (error: unknown) {
    return handleApiError(error);
  }
}
