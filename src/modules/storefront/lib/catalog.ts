import {
  PUBLIC_PRODUCT_PAGE_SIZE,
  type PublicProductQueryInput,
} from "@/modules/products/schemas/public-product.schema";

/**
 * Estado del catálogo: la URL es el único lugar donde vive. Este archivo es el
 * traductor entre los `searchParams` cortos que ve la persona (`?category=audio`)
 * y los parámetros de la API pública (`categorySlug`), y no toca React ni la red.
 */

export const CATALOG_PATH = "/products";

export const CATALOG_PAGE_SIZE = PUBLIC_PRODUCT_PAGE_SIZE;

/** Ruta de la ficha pública. La arman las tarjetas, el buscador y los relacionados. */
export function productHref(slug: string): string {
  return `${CATALOG_PATH}/${slug}`;
}

export type PriceRangeId = "lt500" | "500-1500" | "1500-4000" | "gt4000";

type PriceRange = {
  id: PriceRangeId;
  label: string;
  /** Extremos en centavos enteros: la misma unidad de `products.price_cents`. */
  minCents: number;
  maxCents?: number;
};

export const PRICE_RANGES: readonly PriceRange[] = [
  { id: "lt500", label: "< S/ 500", minCents: 0, maxCents: 50000 },
  {
    id: "500-1500",
    label: "S/ 500 – 1.500",
    minCents: 50000,
    maxCents: 150000,
  },
  {
    id: "1500-4000",
    label: "S/ 1.500 – 4.000",
    minCents: 150000,
    maxCents: 400000,
  },
  { id: "gt4000", label: "> S/ 4.000", minCents: 400000 },
];

export type CatalogSortId = "newest" | "price-asc" | "price-desc" | "discount";

type CatalogSort = {
  id: CatalogSortId;
  label: string;
  sortBy: PublicProductQueryInput["sortBy"];
  sortDir: PublicProductQueryInput["sortDir"];
};

export const CATALOG_SORTS: readonly CatalogSort[] = [
  {
    id: "newest",
    label: "Orden del catálogo",
    sortBy: "createdAt",
    sortDir: "desc",
  },
  {
    id: "price-asc",
    label: "Menor precio",
    sortBy: "priceCents",
    sortDir: "asc",
  },
  {
    id: "price-desc",
    label: "Mayor precio",
    sortBy: "priceCents",
    sortDir: "desc",
  },
  {
    id: "discount",
    label: "Mayor descuento",
    sortBy: "discount",
    sortDir: "desc",
  },
];

export const DEFAULT_SORT: CatalogSortId = "newest";

export type CatalogState = {
  q: string;
  category: string | null;
  price: PriceRangeId | null;
  stock: boolean;
  deals: boolean;
  sort: CatalogSortId;
  page: number;
};

export type CatalogPatch = Partial<CatalogState>;

export const EMPTY_CATALOG_STATE: CatalogState = {
  q: "",
  category: null,
  price: null,
  stock: false,
  deals: false,
  sort: DEFAULT_SORT,
  page: 1,
};

// Solo se necesita leer: acepta tanto `URLSearchParams` como el
// `ReadonlyURLSearchParams` que devuelve `useSearchParams`.
type ReadableParams = Pick<URLSearchParams, "get">;

function findRange(id: string | null): PriceRange | null {
  return PRICE_RANGES.find((range) => range.id === id) ?? null;
}

function findSort(id: string | null): CatalogSort {
  return (
    CATALOG_SORTS.find((sort) => sort.id === id) ??
    // El primero es el orden por defecto; nunca es undefined.
    CATALOG_SORTS[0]
  );
}

function parsePage(raw: string | null): number {
  const page = Number(raw);

  return Number.isInteger(page) && page >= 1 ? page : 1;
}

/** `searchParams` → estado. Un valor inválido cae en su valor por defecto. */
export function parseCatalogParams(params: ReadableParams): CatalogState {
  return {
    q: params.get("q")?.trim() ?? "",
    category: params.get("category"),
    price: findRange(params.get("price"))?.id ?? null,
    stock: params.get("stock") === "1",
    deals: params.get("deals") === "1",
    sort: findSort(params.get("sort")).id,
    page: parsePage(params.get("page")),
  };
}

/** Estado → query string. Lo que está en su valor por defecto no se escribe. */
export function toCatalogQueryString(state: CatalogState): string {
  const params = new URLSearchParams();

  if (state.q !== "") {
    params.set("q", state.q);
  }

  if (state.category !== null) {
    params.set("category", state.category);
  }

  if (state.price !== null) {
    params.set("price", state.price);
  }

  if (state.stock) {
    params.set("stock", "1");
  }

  if (state.deals) {
    params.set("deals", "1");
  }

  if (state.sort !== DEFAULT_SORT) {
    params.set("sort", state.sort);
  }

  if (state.page > 1) {
    params.set("page", String(state.page));
  }

  return params.toString();
}

export function toCatalogHref(state: CatalogState): string {
  const query = toCatalogQueryString(state);

  return query === "" ? CATALOG_PATH : `${CATALOG_PATH}?${query}`;
}

/** Estado → parámetros de `/api/storefront/products`. */
export function toCatalogQuery(state: CatalogState): PublicProductQueryInput {
  const sort = findSort(state.sort);
  const range = findRange(state.price);

  return {
    page: state.page,
    pageSize: CATALOG_PAGE_SIZE,
    sortBy: sort.sortBy,
    sortDir: sort.sortDir,
    ...(state.q === "" ? {} : { search: state.q }),
    ...(state.category === null ? {} : { categorySlug: state.category }),
    ...(range === null
      ? {}
      : {
          minPriceCents: range.minCents,
          ...(range.maxCents === undefined
            ? {}
            : { maxPriceCents: range.maxCents }),
        }),
    ...(state.stock ? { inStock: true } : {}),
    ...(state.deals ? { onlyOffers: true } : {}),
  };
}

/** Hay algo que limpiar: el orden y la página no cuentan como filtro. */
export function hasActiveFilters(state: CatalogState): boolean {
  return (
    state.q !== "" ||
    state.category !== null ||
    state.price !== null ||
    state.stock ||
    state.deals
  );
}
