import type { CategoryQueryInput } from "@/modules/categories/schemas/category.schema";

import type { ProductQueryInput } from "./schemas/product.schema";

export const DEFAULT_PAGE_SIZE = 10;

export const SEARCH_DEBOUNCE_MS = 400;

export const PAGE_SIZE_OPTIONS = [10, 20, 50] as const;

export const PRODUCT_STATUS_OPTIONS = [
  { value: "all", label: "Todos" },
  { value: "true", label: "Publicados" },
  { value: "false", label: "Despublicados" },
] as const;

export type ProductStatusFilter =
  (typeof PRODUCT_STATUS_OPTIONS)[number]["value"];

export const ALL_CATEGORIES = "all";

// Los `Select` de categoría (toolbar y formulario) necesitan el catálogo de
// categorías publicadas, no la página que se muestre en /admin/categories.
// Es un objeto de módulo para que su query key sea estable entre renders.
export const CATEGORY_OPTIONS_QUERY: CategoryQueryInput = {
  page: 1,
  pageSize: 100,
  isActive: true,
  sortBy: "name",
  sortDir: "asc",
};

// Columnas que el listado sabe ordenar en servidor. El `sortBy` del query
// schema es la fuente: esto solo restringe qué acepta la UI.
export const PRODUCT_SORTABLE_FIELDS = [
  "name",
  "priceCents",
  "stock",
  "createdAt",
  "updatedAt",
] as const satisfies readonly ProductQueryInput["sortBy"][];

export const productKeys = {
  all: ["products"] as const,
  lists: () => [...productKeys.all, "list"] as const,
  list: (params: ProductQueryInput) =>
    [...productKeys.lists(), params] as const,
  details: () => [...productKeys.all, "detail"] as const,
  detail: (id: string) => [...productKeys.details(), id] as const,
};
