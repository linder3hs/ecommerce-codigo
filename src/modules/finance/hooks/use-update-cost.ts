"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { productKeys } from "@/modules/products/constants";

import { unitPriceKeys } from "../constants";
import { unitPriceService } from "../services/unit-price.service";

import type { UpdateCostInput } from "../schemas/unit-price.schema";

/**
 * Edición auditada del costo. Invalida dos listados porque el costo se ve en
 * dos pantallas: el de Finanzas (`unitPriceKeys`) y el de productos
 * (`productKeys`), que lo recibe en `costCents` cuando el actor tiene
 * `product_cost.view` y quedaría con el valor viejo en el formulario de edición.
 *
 * La invalidación va en `onSettled` y no en `onSuccess`, con el mismo criterio
 * que `useAdjustStock`: el 400 "El costo ya tenía ese valor" significa que lo
 * que hay en pantalla ya no coincide con la base, así que el error es
 * precisamente el caso en el que más urge refrescar.
 *
 * El mensaje del error lo traduce el diálogo que confirma, no este hook.
 */
export function useUpdateCost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateCostInput }) =>
      unitPriceService.updateCost(id, input),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: unitPriceKeys.lists() });
      queryClient.invalidateQueries({ queryKey: productKeys.lists() });
    },
  });
}
