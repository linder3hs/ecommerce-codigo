"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { paymentMethodService } from "../services/payment-method.service";
import { paymentMethodKeys } from "./use-payment-methods";

/**
 * Elimina una tarjeta. La lista se invalida en vez de filtrarse en memoria:
 * borrar la predeterminada promueve otra en el servidor y esa promoción solo
 * se conoce volviendo a pedir la lista.
 */
export function useDeletePaymentMethod() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => paymentMethodService.remove(id),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: paymentMethodKeys.list() }),
  });
}
