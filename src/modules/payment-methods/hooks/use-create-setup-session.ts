"use client";

import { useMutation } from "@tanstack/react-query";

import { rememberSetupBaseline } from "../lib/setup-return";
import { paymentMethodService } from "../services/payment-method.service";

/**
 * Abre la página de Stripe donde se tipea la tarjeta. La redirección se hace
 * con `window.location.href` y no con el router de Next: el destino es un
 * dominio externo y la navegación cliente de Next no sale de la app.
 *
 * La variable de la mutación es cuántas tarjetas había antes de irse: al
 * volver, es lo único que permite saber si el webhook ya escribió la nueva.
 */
export function useCreateSetupSession() {
  // Los genéricos fijan la variable de la mutación sin obligar a `mutationFn` a
  // declarar un parámetro que no usa: el contador solo interesa al `onSuccess`.
  return useMutation<string, Error, number>({
    mutationFn: () => paymentMethodService.createSetupSession(),
    onSuccess: (url, currentCount) => {
      rememberSetupBaseline(currentCount);
      window.location.href = url;
    },
  });
}
