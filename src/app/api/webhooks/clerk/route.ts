import { verifyWebhook } from "@clerk/nextjs/webhooks";

import { handleApiError, jsonError } from "@/lib/api-error";
import { logAudit } from "@/lib/audit";
import { getDb } from "@/server/db";
import { roleRepository } from "@/server/repositories/role.repository";
import { userRepository } from "@/server/repositories/user.repository";

import type { WebhookEvent } from "@clerk/nextjs/webhooks";
import type { NextRequest } from "next/server";

// Endpoint público a propósito: no hay sesión de Clerk detrás de un webhook.
// La autenticación es la firma Svix que verifica `verifyWebhook`.

// Los payloads se derivan de `WebhookEvent` en lugar de importarse de
// `@clerk/backend`: así el tipo sigue al paquete que la app declara y no a una
// dependencia transitiva.
type ClerkUserData = Extract<
  WebhookEvent,
  { type: "user.created" | "user.updated" }
>["data"];
type ClerkUserDeletedData = Extract<
  WebhookEvent,
  { type: "user.deleted" }
>["data"];

function resolvePrimaryEmail(data: ClerkUserData): string | null {
  const primary = data.email_addresses.find(
    (email) => email.id === data.primary_email_address_id,
  );

  return (
    primary?.email_address ?? data.email_addresses[0]?.email_address ?? null
  );
}

function resolveIntendedRoleSlug(data: ClerkUserData): string | null {
  const value = data.public_metadata?.intendedRoleSlug;

  return typeof value === "string" && value.length > 0 ? value : null;
}

/**
 * Cierra el circuito de la invitación: `POST /api/admin/customers` guarda el
 * rol intencionado en `publicMetadata` de la Clerk Invitation y Clerk lo copia
 * al `publicMetadata` del usuario al aceptar. Aquí se traduce a una fila de
 * `user_roles`.
 *
 * Solo asigna si el usuario todavía no tiene rol: los webhooks son
 * at-least-once y sin orden, y un reenvío no puede pisar un rol que un
 * administrador ya cambió a mano.
 */
async function applyIntendedRole(
  userId: string,
  data: ClerkUserData,
): Promise<void> {
  const slug = resolveIntendedRoleSlug(data);

  if (!slug) {
    return;
  }

  const [current, role] = await Promise.all([
    roleRepository.findByUserId(userId),
    roleRepository.findBySlug(slug),
  ]);

  if (current || !role) {
    return;
  }

  // Sin actor: la asignación la ejecuta el webhook, no una persona. Quién la
  // originó queda en el `user.invited` que registró el endpoint de invitación.
  await getDb().transaction(async (tx) => {
    await roleRepository.assignToUser(
      { userId, roleId: role.id, assignedBy: null },
      tx,
    );

    await logAudit(tx, {
      action: "user.role_changed",
      entityType: "user",
      entityId: userId,
      actorId: null,
      changes: { before: { role: null }, after: { role: role.slug } },
      metadata: { source: "clerk_invitation" },
      severity: "warning",
    });
  });
}

async function syncUser(data: ClerkUserData): Promise<void> {
  const email = resolvePrimaryEmail(data);

  // Sin email no hay fila válida (`users.email` es NOT NULL). Se ignora en
  // lugar de reventar: reintentar el mismo evento daría el mismo resultado.
  if (!email) {
    console.warn(`Webhook de Clerk: usuario ${data.id} sin email, se ignora.`);

    return;
  }

  const user = await userRepository.upsertByClerkId({
    clerkId: data.id,
    email,
    firstName: data.first_name,
    lastName: data.last_name,
    imageUrl: data.image_url,
  });

  await applyIntendedRole(user.id, data);
}

// Borrar en Clerk desactiva el espejo local en vez de borrarlo: `audit_logs`
// y `user_roles` cuelgan de `users.id` y la traza de quién hizo qué no se
// pierde porque alguien cierre su cuenta.
async function deactivateUser(data: ClerkUserDeletedData): Promise<void> {
  if (!data.id) {
    console.warn("Webhook de Clerk: user.deleted sin id, se ignora.");

    return;
  }

  const user = await userRepository.findByClerkId(data.id);

  if (!user) {
    return;
  }

  await userRepository.setActive(user.id, false);
}

// Svix entrega at-least-once y sin orden garantizado: `user.updated` puede
// llegar antes que `user.created`. Los tres casos son idempotentes por
// `clerkId`, así que reenviar un evento converge al mismo estado.
async function handleEvent(event: WebhookEvent): Promise<void> {
  switch (event.type) {
    case "user.created":
    case "user.updated":
      await syncUser(event.data);
      break;

    case "user.deleted":
      await deactivateUser(event.data);
      break;

    default:
      break;
  }
}

export async function POST(request: NextRequest) {
  let event: WebhookEvent;

  try {
    event = await verifyWebhook(request);
  } catch (error: unknown) {
    console.error("Webhook de Clerk: firma inválida.", error);

    return jsonError(400, "No se pudo verificar la firma del webhook.");
  }

  try {
    await handleEvent(event);

    // 200 explícito: Svix reintenta cualquier respuesta que no sea 2xx.
    return Response.json({ received: true });
  } catch (error: unknown) {
    return handleApiError(error);
  }
}
