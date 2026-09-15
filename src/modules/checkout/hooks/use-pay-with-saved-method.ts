"use client";

import { useMutation } from "@tanstack/react-query";

import { checkoutService } from "../services/checkout.service";

import type { PayWithSavedInput } from "../schemas/checkout.schema";

function checkoutSuccessHref(orderId: string): string {
  return `/checkout/success?order_id=${encodeURIComponent(orderId)}`;
}

/**
 * Cobra con la tarjeta elegida. Solo el rechazo se queda en el carrito: quien
 * compra necesita ver el motivo y poder elegir otra tarjeta sin perder sus
 * líneas. Los otros dos desenlaces sacan el navegador de la vista.
 *
 * La navegación es `window.location.href` y no el router de Next porque el
 * destino puede ser el dominio del banco (3DS por redirect), donde la
 * navegación cliente de Next no llega.
 *
 * No se vacía el carrito acá: el pago todavía no está confirmado —eso lo
 * escribe el webhook— y vaciarlo antes dejaría sin nada a quien vuelva de un
 * 3DS abandonado.
 */
export function usePayWithSavedMethod() {
  return useMutation({
    mutationFn: (input: PayWithSavedInput) =>
      checkoutService.payWithSavedMethod(input),
    onSuccess: (result) => {
      if (result.status === "failed") {
        return;
      }

      window.location.href =
        result.redirectUrl ?? checkoutSuccessHref(result.orderId);
    },
  });
}
