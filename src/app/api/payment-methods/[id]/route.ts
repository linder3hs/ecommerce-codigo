import { handleApiError, NotFoundError } from "@/lib/api-error";
import { getCurrentAppUser, requireAuth } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { getStripe, isResourceMissingError } from "@/lib/stripe";
import { paymentMethodIdSchema } from "@/modules/payment-methods/schemas/payment-method.schema";
import { getDb } from "@/server/db";
import { paymentMethodRepository } from "@/server/repositories/payment-method.repository";

// Mismo mensaje para "no existe" y "no es tuya": distinguirlos convertiría el
// endpoint en un oráculo de qué tarjetas hay guardadas.
const NOT_FOUND_MESSAGE = "No encontramos esa tarjeta.";

/**
 * Baja definitiva. Primero se desasocia en Stripe y recién después se borra la
 * fila: al revés quedaría una tarjeta viva en el Customer sin nada que la
 * muestre. Un `resource_missing` no aborta —alguien la desasoció desde el
 * Dashboard y el efecto buscado ya está—, cualquier otro error de Stripe sí,
 * sin tocar la base.
 *
 * Hard delete y no baja lógica: una fila "borrada" apuntaría a un PaymentMethod
 * que ya no se puede cobrar.
 */
export async function DELETE(
  _request: Request,
  ctx: RouteContext<"/api/payment-methods/[id]">,
) {
  try {
    await requireAuth();

    const [{ id }, user] = await Promise.all([ctx.params, getCurrentAppUser()]);

    const paymentMethodId = paymentMethodIdSchema.parse(id);
    const row = user
      ? await paymentMethodRepository.findByIdForUser(paymentMethodId, user.id)
      : null;

    if (!row) {
      throw new NotFoundError(NOT_FOUND_MESSAGE);
    }

    try {
      await getStripe().paymentMethods.detach(row.stripePaymentMethodId);
    } catch (error: unknown) {
      if (!isResourceMissingError(error)) {
        throw error;
      }
    }

    await getDb().transaction(async (tx) => {
      const deleted = await paymentMethodRepository.deleteForUser(
        row.id,
        row.userId,
        tx,
      );

      if (!deleted) {
        return;
      }

      await logAudit(tx, {
        action: "payment_method.deleted",
        entityType: "payment_method",
        entityId: deleted.id,
        actorId: deleted.userId,
        // Nunca el `pm_…` ni el Customer: son tokens y la tabla no se borra.
        metadata: { brand: deleted.brand, last4: deleted.last4 },
      });
    });

    // 204 sin cuerpo: no queda recurso que devolver y la lista la refresca el
    // cliente invalidando su consulta.
    return new Response(null, { status: 204 });
  } catch (error: unknown) {
    return handleApiError(error);
  }
}
