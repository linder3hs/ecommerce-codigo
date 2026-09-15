import { handleApiError } from "@/lib/api-error";
import { getCurrentAppUser, requireAuth } from "@/lib/auth";
import { toPaymentMethod } from "@/modules/payment-methods/schemas/payment-method.schema";
import { paymentMethodRepository } from "@/server/repositories/payment-method.repository";

/**
 * Tarjetas guardadas del usuario de la sesión. Sin parámetros: el filtro por
 * dueño no se negocia desde el cliente, sale de la sesión de Clerk.
 *
 * El espejo local todavía sin sincronizar devuelve la lista vacía en vez de un
 * 409: quien acaba de registrarse no tiene tarjetas y el vacío es la respuesta
 * correcta, no un error.
 */
export async function GET() {
  try {
    await requireAuth();

    const user = await getCurrentAppUser();
    const rows = user
      ? await paymentMethodRepository.findManyByUser(user.id)
      : [];

    return Response.json(
      { data: rows.map(toPaymentMethod) },
      // Dato privado del comprador: nunca se cachea en ningún borde.
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error: unknown) {
    return handleApiError(error);
  }
}
