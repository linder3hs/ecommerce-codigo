import "server-only";

import { getStripe } from "@/lib/stripe";
import { userRepository } from "@/server/repositories/user.repository";

import type { UserRow } from "@/server/repositories/user.repository";

function fullName(user: UserRow): string | undefined {
  const name = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();

  return name.length > 0 ? name : undefined;
}

/**
 * Customer de Stripe del comprador, creándolo la primera vez. El id se guarda
 * en `users.stripe_customer_id` para que la segunda tarjeta caiga en el mismo
 * Customer: sin esa columna, cada alta crearía uno nuevo y las tarjetas
 * guardadas quedarían repartidas entre Customers que nadie vuelve a mirar.
 *
 * `metadata.appUserId` es la vuelta: desde el Dashboard se puede saber a qué
 * cuenta de la tienda pertenece un Customer.
 */
export async function getOrCreateStripeCustomer(
  user: UserRow,
): Promise<string> {
  const existing = await userRepository.findStripeCustomerId(user.id);

  if (existing) {
    return existing;
  }

  const customer = await getStripe().customers.create({
    email: user.email,
    name: fullName(user),
    metadata: { appUserId: user.id },
  });

  // `null` significa que otra petición simultánea ganó la carrera y ya escribió
  // su Customer. Se respeta el guardado: dos Customers para el mismo usuario es
  // desprolijo, pero apuntar a uno distinto del que tienen las tarjetas ya
  // guardadas sería un error de datos.
  const saved = await userRepository.setStripeCustomerId(user.id, customer.id);

  return saved ?? (await userRepository.findStripeCustomerId(user.id)) ?? customer.id;
}
