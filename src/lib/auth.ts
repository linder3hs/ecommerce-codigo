import "server-only";

import { auth } from "@clerk/nextjs/server";

import { UnauthorizedError } from "@/lib/api-error";
import { userRepository } from "@/server/repositories/user.repository";

import type { UserRow } from "@/server/repositories/user.repository";

/**
 * Puerta de autenticación del servidor: devuelve el `clerkId` de la sesión
 * activa o lanza 401. Autenticación, no autorización: quién es, no qué puede.
 */
export async function requireAuth(): Promise<string> {
  const { userId } = await auth();

  if (!userId) {
    throw new UnauthorizedError();
  }

  return userId;
}

/**
 * Resuelve la fila local de `users` a partir de la sesión de Clerk. Devuelve
 * `null` sin sesión y también cuando el webhook `user.created` todavía no ha
 * llegado: Svix es at-least-once y asíncrono, el espejo puede ir un instante
 * detrás de Clerk.
 */
export async function getCurrentAppUser(): Promise<UserRow | null> {
  const { userId } = await auth();

  if (!userId) {
    return null;
  }

  return userRepository.findByClerkId(userId);
}
