"use client";

import { useQuery } from "@tanstack/react-query";

import { checkoutService } from "../services/checkout.service";

// Ritmo del sondeo mientras el webhook de Stripe todavía no confirmó el pago.
const PENDING_POLL_MS = 2_000;

/**
 * De dónde sale la compra en la página de retorno. Los dos caminos de pago
 * vuelven con un identificador distinto —la sesión hosteada con `session_id`,
 * la tarjeta guardada con `order_id`— y el resto del comportamiento es idéntico.
 */
export type CheckoutOrderSource =
  | { type: "session"; id: string }
  | { type: "order"; id: string };

export const checkoutKeys = {
  all: ["checkout"] as const,
  order: (source: CheckoutOrderSource) =>
    [...checkoutKeys.all, "order", source.type, source.id] as const,
};

/**
 * Estado de la orden en la página de retorno. El fulfillment es del webhook,
 * así que la orden puede llegar todavía en `pending`: se reconsulta cada dos
 * segundos y el sondeo se apaga solo en cuanto el estado es definitivo.
 *
 * Una compra ajena o inexistente resuelve como `null` —el service traduce el
 * 404— y no como error, para no disparar reintentos de red.
 */
export function useCheckoutOrder(source: CheckoutOrderSource) {
  return useQuery({
    queryKey: checkoutKeys.order(source),
    queryFn: () =>
      source.type === "session"
        ? checkoutService.getBySessionId(source.id)
        : checkoutService.getById(source.id),
    refetchInterval: (query) =>
      query.state.data?.status === "pending" ? PENDING_POLL_MS : false,
  });
}
