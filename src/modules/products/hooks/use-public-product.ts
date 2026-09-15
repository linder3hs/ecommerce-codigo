"use client";

import { useQuery } from "@tanstack/react-query";

// La fábrica de claves se reutiliza en vez de declarar una segunda: dos
// factorías para el mismo recurso divergen a la primera invalidación.
import { publicProductService } from "../services/public-product.service";
import { publicProductKeys } from "./use-public-products";

/**
 * Ficha pública por slug. El service resuelve el 404 devolviendo `null`, así
 * que un slug inexistente llega acá como dato —`data === null`— y no como
 * error: el `retry: 1` global no reintenta lo que nunca falló.
 */
export function usePublicProduct(slug: string) {
  return useQuery({
    queryKey: publicProductKeys.detail(slug),
    queryFn: () => publicProductService.getBySlug(slug),
    enabled: slug !== "",
  });
}
