"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { productKeys } from "../constants";
import { productService } from "../services/product.service";

import type { AdjustStockInput } from "../schemas/product.schema";

/**
 * Ajuste rápido de stock por delta. Se invalida `lists()` —no una página
 * concreta— porque la fila puede entrar o salir del filtro "solo stock bajo", y
 * `detail(id)` para que el producto abierto en /admin/products no quede con el
 * stock viejo.
 *
 * La invalidación va en `onSettled`, no en `onSuccess`: cuando el handler
 * responde 400 por stock insuficiente, el motivo es que el stock en pantalla ya
 * no coincide con el de la base, así que el error es precisamente el caso en el
 * que más urge refrescar. `onSettled` cubre éxito y error sin duplicar las dos
 * llamadas.
 *
 * El mensaje del 400 lo traduce el componente que confirma, no este hook.
 */
export function useAdjustStock() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: AdjustStockInput }) =>
      productService.adjustStock(id, input.delta),
    onSettled: (_data, _error, { id }) => {
      queryClient.invalidateQueries({ queryKey: productKeys.lists() });
      queryClient.invalidateQueries({ queryKey: productKeys.detail(id) });
    },
  });
}
