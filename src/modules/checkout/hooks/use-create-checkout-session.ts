"use client";

import { useMutation } from "@tanstack/react-query";

import type { CheckoutSessionInput } from "../schemas/checkout.schema";
import { checkoutService } from "../services/checkout.service";

/**
 * Abre la sesión de pago y manda el navegador a Stripe. La redirección se hace
 * con `window.location.href` y no con el router de Next: el destino es un
 * dominio externo y la navegación cliente de Next no sale de la app.
 *
 * No se vacía el carrito acá: el pago todavía no ocurrió y cancelar debe
 * devolver al comprador su carrito intacto.
 */
export function useCreateCheckoutSession() {
  return useMutation({
    mutationFn: (items: CheckoutSessionInput["items"]) =>
      checkoutService.createSession(items),
    onSuccess: (url) => {
      window.location.href = url;
    },
  });
}
