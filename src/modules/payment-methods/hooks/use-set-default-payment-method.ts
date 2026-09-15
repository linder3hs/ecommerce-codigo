"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { paymentMethodService } from "../services/payment-method.service";
import { paymentMethodKeys } from "./use-payment-methods";

/**
 * Marca una tarjeta como predeterminada. No se escribe el resultado en la
 * caché a mano: la respuesta trae una sola tarjeta y el cambio también apaga el
 * `isDefault` de la anterior, así que la lista se vuelve a pedir entera.
 */
export function useSetDefaultPaymentMethod() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => paymentMethodService.setDefault(id),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: paymentMethodKeys.list() }),
  });
}
