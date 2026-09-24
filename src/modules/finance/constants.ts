import type { ProductQueryInput } from "@/modules/products/schemas/product.schema";

import type { UnitPriceQueryInput } from "./schemas/unit-price.schema";

/**
 * Orden fijo del listado de precio unitario: alfabético por nombre. No es
 * configurable a propósito —el margen es un valor derivado y no una columna, así
 * que Postgres no puede ordenar por él— y por eso no viaja en la query: lo aplica
 * el handler al llamar a `productRepository.list`.
 */
export const UNIT_PRICE_DEFAULT_QUERY: Pick<
  ProductQueryInput,
  "sortBy" | "sortDir"
> = {
  sortBy: "name",
  sortDir: "asc",
};

export const unitPriceKeys = {
  all: ["unit-prices"] as const,
  lists: () => [...unitPriceKeys.all, "list"] as const,
  list: (params: UnitPriceQueryInput) =>
    [...unitPriceKeys.lists(), params] as const,
};
