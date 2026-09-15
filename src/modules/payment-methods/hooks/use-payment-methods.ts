"use client";

import { useAuth } from "@clerk/nextjs";
import { useQuery } from "@tanstack/react-query";

import { paymentMethodService } from "../services/payment-method.service";

import type { PaymentMethod } from "../types/payment-method";

// Ritmo del sondeo mientras el webhook de Stripe todavía no confirmó el alta.
const CONFIRMING_POLL_MS = 2_000;

export const paymentMethodKeys = {
  all: ["payment-methods"] as const,
  list: () => [...paymentMethodKeys.all, "list"] as const,
};

type UsePaymentMethodsOptions = {
  /**
   * Sondea la lista mientras el predicado diga que sí, con la última respuesta
   * en la mano. Es una función y no un booleano porque la decisión depende de
   * lo que acaba de devolver la propia consulta —si la tarjeta ya apareció— y
   * eso no se conoce antes de llamar al hook.
   *
   * Fuera de ese momento la lista solo cambia por acciones de la propia
   * persona, que ya invalidan la consulta.
   */
  awaitingNew?: (cards: PaymentMethod[]) => boolean;
};

/**
 * Tarjetas guardadas del usuario. Sin sesión la consulta ni se dispara: el
 * endpoint responde 401 y un carrito de visitante no tiene nada que preguntar.
 */
export function usePaymentMethods({
  awaitingNew,
}: UsePaymentMethodsOptions = {}) {
  const { isLoaded, isSignedIn } = useAuth();

  return useQuery({
    queryKey: paymentMethodKeys.list(),
    queryFn: () => paymentMethodService.list(),
    // `=== true` y no solo el valor: mientras Clerk no cargó, `isSignedIn` puede
    // ser `undefined`, y `enabled: undefined` para TanStack Query significa
    // "habilitada" y dispararía un 401.
    enabled: isLoaded && isSignedIn === true,
    refetchInterval: (query) => {
      const cards = query.state.data;

      return cards && awaitingNew?.(cards) ? CONFIRMING_POLL_MS : false;
    },
  });
}
