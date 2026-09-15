import { z } from "zod";

import { CART_MAX_QTY } from "@/modules/cart/store/cart-store";
import { paymentMethodIdSchema } from "@/modules/payment-methods/schemas/payment-method.schema";

// Tope de líneas por compra: el carrito no lo limita, pero una sesión de
// Checkout con cientos de líneas es abuso, no una compra.
const MAX_LINES = 50;

// El cliente manda QUÉ quiere comprar, nunca CUÁNTO cuesta: el importe de cada
// línea sale de `products.price_cents` leído en el servidor. Un `priceCents` en
// el body no se valida, simplemente no existe en el schema y Zod lo descarta.
export const checkoutSessionInputSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.uuid("El producto seleccionado no es válido."),
        qty: z
          .number("La cantidad debe ser un número.")
          .int("La cantidad debe ser un número entero.")
          .min(1, "La cantidad mínima es 1.")
          .max(CART_MAX_QTY, `La cantidad máxima es ${CART_MAX_QTY}.`),
      }),
      "Las líneas del carrito no son válidas.",
    )
    .min(1, "El carrito está vacío.")
    .max(MAX_LINES, `Una compra admite máximo ${MAX_LINES} productos distintos.`)
    // Un producto repetido en dos líneas duplicaría la validación de stock
    // contra el mismo registro y dejaría descontar más unidades de las que hay.
    .refine(
      (items) => new Set(items.map((item) => item.productId)).size === items.length,
      "Hay productos repetidos en el carrito.",
    ),
});

export type CheckoutSessionInput = z.infer<typeof checkoutSessionInputSchema>;

/**
 * Pago con una tarjeta ya guardada. Es el mismo carrito más el id de NUESTRA
 * fila, no el `pm_…` de Stripe: el token lo resuelve el servidor a partir del
 * uuid y así el navegador nunca lo ve ni puede inventarlo.
 */
export const payWithSavedInputSchema = checkoutSessionInputSchema.extend({
  paymentMethodId: paymentMethodIdSchema,
});

export type PayWithSavedInput = z.infer<typeof payWithSavedInputSchema>;

// Identificador de sesión de Stripe tal como llega en `?session_id=`. Validar
// la forma antes del repositorio evita gastar una consulta con basura de la URL.
export const stripeSessionIdSchema = z
  .string("El identificador de la sesión debe ser texto.")
  .trim()
  .max(255, "El identificador de la sesión no es válido.")
  .startsWith("cs_", "El identificador de la sesión no es válido.");
