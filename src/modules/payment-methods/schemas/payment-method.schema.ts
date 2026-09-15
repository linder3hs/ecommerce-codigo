import { z } from "zod";

import type { PaymentMethod } from "../types/payment-method";
import type { PaymentMethodRow } from "@/server/repositories/payment-method.repository";

// Id de nuestra fila tal como llega en la ruta o en el body del pago. Validar
// la forma antes del repositorio evita gastar una consulta con basura de la URL.
export const paymentMethodIdSchema = z.uuid(
  "La tarjeta indicada no es válida.",
);

/**
 * Forma de la tarjeta tal como sale de la API. Existe para que el servidor
 * proyecte SIEMPRE por acá y no devuelva la fila entera: `stripe_payment_method_id`
 * y `stripe_customer_id` no salen nunca al navegador.
 */
export const paymentMethodSchema = z.object({
  id: z.uuid(),
  brand: z.string(),
  last4: z.string(),
  expMonth: z.number().int(),
  expYear: z.number().int(),
  isDefault: z.boolean(),
});

/**
 * Proyección obligatoria antes de responder. Zod descarta las claves que no
 * están en el schema, así que el `pm_…` no puede escaparse aunque alguien
 * devuelva la fila entera por descuido. El tipo de retorno es `PaymentMethod`:
 * si el schema y el tipo dejan de coincidir, esto no compila.
 */
export function toPaymentMethod(row: PaymentMethodRow): PaymentMethod {
  return paymentMethodSchema.parse(row);
}
