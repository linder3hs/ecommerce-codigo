"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";

import { usePublicProducts } from "@/modules/products/hooks/use-public-products";

import {
  EMPTY_CATALOG_STATE,
  parseCatalogParams,
  toCatalogHref,
  toCatalogQuery,
  type CatalogPatch,
  type CatalogState,
} from "../lib/catalog";
import { CatalogFilters } from "./catalog-filters";
import { CatalogGrid } from "./catalog-grid";
import { CatalogToolbar } from "./catalog-toolbar";

/**
 * Isla cliente del catálogo. La URL es el estado: se lee con `useSearchParams`
 * y se escribe con `router.replace`, así que un enlace copiado reproduce la
 * vista exacta. Nada de esto vive en Zustand: son datos de servidor y el
 * filtro es parte de la dirección, no del estado local.
 *
 * Va siempre dentro de un `<Suspense>`: `useSearchParams` deja fuera del
 * prerender todo el árbol hasta el límite más cercano.
 */
export function CatalogView() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const state = useMemo(
    () => parseCatalogParams(searchParams),
    [searchParams],
  );
  const query = useMemo(() => toCatalogQuery(state), [state]);
  const productsQuery = usePublicProducts(query);

  const navigate = useCallback(
    (next: CatalogState) => {
      // `replace` y no `push`: cada chip dejaría una entrada en el historial y
      // volver atrás obligaría a deshacer filtro por filtro. `scroll: false`
      // mantiene la posición de la grilla.
      router.replace(toCatalogHref(next), { scroll: false });
    },
    [router],
  );

  // Cualquier cambio de filtro vuelve a la página 1: la página actual puede no
  // existir en el resultado nuevo y la grilla quedaría vacía.
  const patch = useCallback(
    (changes: CatalogPatch) => {
      navigate({ ...state, ...changes, page: changes.page ?? 1 });
    },
    [navigate, state],
  );

  const clear = useCallback(() => {
    navigate({ ...EMPTY_CATALOG_STATE, sort: state.sort });
  }, [navigate, state.sort]);

  const products = productsQuery.data?.data ?? [];
  const meta = productsQuery.data?.meta;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3.5 lg:flex-row lg:gap-5">
      <CatalogFilters state={state} onChange={patch} onClear={clear} />

      <main className="min-w-0 flex-1 lg:overflow-y-auto lg:pr-1">
        <CatalogToolbar
          shown={products.length}
          total={meta?.total ?? 0}
          sort={state.sort}
          onSortChange={(sort) => patch({ sort })}
        />

        <CatalogGrid
          products={products}
          isPending={productsQuery.isPending}
          isError={productsQuery.isError}
          page={state.page}
          totalPages={meta?.totalPages ?? 1}
          onRetry={() => void productsQuery.refetch()}
          onPageChange={(page) => patch({ page })}
          onClear={clear}
        />
      </main>
    </div>
  );
}
