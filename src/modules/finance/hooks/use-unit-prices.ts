"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { unitPriceKeys } from "../constants";
import { unitPriceService } from "../services/unit-price.service";

import type { UnitPriceQueryInput } from "../schemas/unit-price.schema";

/**
 * Listado paginado de precio unitario. `keepPreviousData` mantiene en pantalla
 * la página anterior mientras llega la nueva: sin él, cada cambio de página o
 * de búsqueda vaciaría la tabla y devolvería el skeleton.
 */
export function useUnitPrices(params: UnitPriceQueryInput) {
  return useQuery({
    queryKey: unitPriceKeys.list(params),
    queryFn: () => unitPriceService.list(params),
    placeholderData: keepPreviousData,
  });
}
