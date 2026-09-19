"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { adminOrderKeys } from "../constants";
import { adminOrderService } from "../services/admin-order.service";

import type { UpdateOrderStatusInput } from "../schemas/admin-order.schema";

/**
 * Cambio manual de estado. Se invalida `lists()` —no una página concreta—
 * porque la fila puede salir del filtro de estado activo, y `detail(id)` para
 * que el diálogo abierto refleje el estado nuevo.
 *
 * Los errores no se tocan aquí: el 409 de carrera con el webhook de Stripe lo
 * traduce a mensaje el componente que confirma.
 */
export function useUpdateOrderStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: string;
      input: UpdateOrderStatusInput;
    }) => adminOrderService.updateStatus(id, input),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: adminOrderKeys.lists() });
      queryClient.invalidateQueries({ queryKey: adminOrderKeys.detail(id) });
    },
  });
}
