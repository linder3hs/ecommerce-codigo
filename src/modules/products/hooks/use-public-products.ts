"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";

import type { PublicProductQueryInput } from "../schemas/public-product.schema";
import { publicProductService } from "../services/public-product.service";

// Claves propias, fuera de `productKeys`: invalidar el catálogo del panel tras
// una edición no tiene por qué tirar la caché del storefront, y al revés.
export const publicProductKeys = {
  all: ["public-products"] as const,
  lists: () => [...publicProductKeys.all, "list"] as const,
  list: (params: PublicProductQueryInput) =>
    [...publicProductKeys.lists(), params] as const,
};

export function usePublicProducts(
  params: PublicProductQueryInput,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: publicProductKeys.list(params),
    queryFn: () => publicProductService.list(params),
    // El buscador cambia de params en cada tecla: sin esto el panel parpadea a
    // vacío entre una consulta y la siguiente.
    placeholderData: keepPreviousData,
    enabled: options?.enabled ?? true,
  });
}
