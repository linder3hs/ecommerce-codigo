import { handleApiError, NotFoundError } from "@/lib/api-error";
import { getCurrentAppUser, requireAuth } from "@/lib/auth";
import {
  paymentMethodIdSchema,
  toPaymentMethod,
} from "@/modules/payment-methods/schemas/payment-method.schema";
import { paymentMethodRepository } from "@/server/repositories/payment-method.repository";

// Mismo mensaje para "no existe" y "no es tuya": distinguirlos convertiría el
// endpoint en un oráculo de qué tarjetas hay guardadas.
const NOT_FOUND_MESSAGE = "No encontramos esa tarjeta.";

/**
 * Marca la tarjeta como predeterminada. Sin body: la acción no tiene
 * parámetros, el recurso es la propia ruta. La exclusividad la resuelve el
 * repositorio en una transacción y la respalda el índice único parcial.
 */
export async function PATCH(
  _request: Request,
  ctx: RouteContext<"/api/payment-methods/[id]/default">,
) {
  try {
    await requireAuth();

    const [{ id }, user] = await Promise.all([ctx.params, getCurrentAppUser()]);

    const paymentMethodId = paymentMethodIdSchema.parse(id);
    const row = user
      ? await paymentMethodRepository.setDefault(paymentMethodId, user.id)
      : null;

    if (!row) {
      throw new NotFoundError(NOT_FOUND_MESSAGE);
    }

    return Response.json(
      { data: toPaymentMethod(row) },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error: unknown) {
    return handleApiError(error);
  }
}
