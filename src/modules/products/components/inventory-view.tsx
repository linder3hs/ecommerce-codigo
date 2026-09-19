"use client";

import { useCallback, useState } from "react";

import { useDebounce } from "@/hooks/use-debounce";

import { INVENTORY_DEFAULT_QUERY, SEARCH_DEBOUNCE_MS } from "../constants";
import { useProducts } from "../hooks/use-products";

import { AdjustStockDialog } from "./adjust-stock-dialog";
import { InventoryTable } from "./inventory-table";
import { InventoryToolbar } from "./inventory-toolbar";

import type { ProductQueryInput } from "../schemas/product.schema";
import type { ProductListItem } from "../types/product";
import type { PaginationState } from "@tanstack/react-table";

const FIRST_PAGE: PaginationState = {
  pageIndex: 0,
  pageSize: INVENTORY_DEFAULT_QUERY.pageSize,
};

export function InventoryView({
  canAdjust,
}: {
  // Lo resuelve el Server Component con los permisos efectivos. Es solo
  // presentación: la barrera real es `requirePermission` en el handler.
  canAdjust: boolean;
}) {
  const [search, setSearch] = useState("");
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [pagination, setPagination] = useState<PaginationState>(FIRST_PAGE);
  const [adjustingProduct, setAdjustingProduct] =
    useState<ProductListItem | null>(null);

  // La búsqueda se debounce acá y no en el toolbar: el toolbar emite el texto
  // crudo y la query se rehace recién cuando el admin deja de escribir.
  const debouncedSearch = useDebounce(search, SEARCH_DEBOUNCE_MS);

  const params: ProductQueryInput = {
    ...INVENTORY_DEFAULT_QUERY,
    page: pagination.pageIndex + 1,
    pageSize: pagination.pageSize,
    search: debouncedSearch.trim() || undefined,
    // `undefined` y no `false` cuando está apagado: así el filtro apagado no
    // cambia la query key ni viaja en la URL, igual que `isActive`.
    lowStockOnly: lowStockOnly || undefined,
  };

  const products = useProducts(params);

  // Cualquier filtro nuevo invalida la página en la que estaba el admin: la
  // página 3 del resultado anterior no existe en el nuevo (AC2).
  const resetToFirstPage = useCallback(() => {
    setPagination((previous) => ({ ...previous, pageIndex: 0 }));
  }, []);

  function handleSearchChange(value: string) {
    setSearch(value);
    resetToFirstPage();
  }

  function handleLowStockOnlyChange(value: boolean) {
    setLowStockOnly(value);
    resetToFirstPage();
  }

  // Estable: las columnas de la tabla se memoizan sobre este callback.
  const handleAdjust = useCallback((product: ProductListItem) => {
    setAdjustingProduct(product);
  }, []);

  // El ajuste invalida el listado, así que tras un 400 por stock insuficiente la
  // fila en pantalla ya trae el stock real. Se relee de la respuesta para que el
  // diálogo no muestre el número viejo del snapshot; si la fila salió del
  // resultado (cambió de página o de filtro), el snapshot es el respaldo.
  const productInDialog =
    adjustingProduct === null
      ? null
      : (products.data?.data.find((row) => row.id === adjustingProduct.id) ??
        adjustingProduct);

  return (
    <div className="flex flex-col gap-6">
      <InventoryToolbar
        search={search}
        onSearchChange={handleSearchChange}
        lowStockOnly={lowStockOnly}
        onLowStockOnlyChange={handleLowStockOnlyChange}
      />

      <InventoryTable
        data={products.data?.data}
        rowCount={products.data?.meta.total ?? 0}
        pagination={pagination}
        onPaginationChange={setPagination}
        canAdjust={canAdjust}
        onAdjust={handleAdjust}
        isLoading={products.isPending}
        isError={products.isError}
        errorMessage={products.error?.message ?? null}
        onRetry={() => void products.refetch()}
      />

      {/* Montado solo con un producto elegido y `key` por id: cada apertura
          arranca con el formulario en blanco. */}
      {canAdjust && productInDialog ? (
        <AdjustStockDialog
          key={productInDialog.id}
          open
          onOpenChange={(next) => {
            if (!next) {
              setAdjustingProduct(null);
            }
          }}
          product={productInDialog}
        />
      ) : null}
    </div>
  );
}
