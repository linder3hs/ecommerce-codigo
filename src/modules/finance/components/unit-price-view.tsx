"use client";

import { useCallback, useState } from "react";

import { useDebounce } from "@/hooks/use-debounce";
import {
  DEFAULT_PAGE_SIZE,
  SEARCH_DEBOUNCE_MS,
} from "@/modules/products/constants";

import { useUnitPrices } from "../hooks/use-unit-prices";

import { EditCostDialog } from "./edit-cost-dialog";
import { UnitPriceTable } from "./unit-price-table";
import { UnitPriceToolbar } from "./unit-price-toolbar";

import type { UnitPriceQueryInput } from "../schemas/unit-price.schema";
import type { UnitPriceRow } from "../types/unit-price";
import type { PaginationState } from "@tanstack/react-table";

const FIRST_PAGE: PaginationState = {
  pageIndex: 0,
  pageSize: DEFAULT_PAGE_SIZE,
};

export function UnitPriceView({
  canEditCost,
}: {
  // Lo resuelve el Server Component con los permisos efectivos. Es solo
  // presentación: la barrera real es `requirePermission` en el handler.
  canEditCost: boolean;
}) {
  const [search, setSearch] = useState("");
  const [pagination, setPagination] = useState<PaginationState>(FIRST_PAGE);
  const [editingProduct, setEditingProduct] = useState<UnitPriceRow | null>(
    null,
  );

  // La búsqueda se debounce acá y no en el toolbar: el toolbar emite el texto
  // crudo y la query se rehace recién cuando el admin deja de escribir.
  const debouncedSearch = useDebounce(search, SEARCH_DEBOUNCE_MS);

  const params: UnitPriceQueryInput = {
    page: pagination.pageIndex + 1,
    pageSize: pagination.pageSize,
    search: debouncedSearch.trim() || undefined,
  };

  const unitPrices = useUnitPrices(params);

  // Buscar algo nuevo invalida la página en la que estaba el admin: la página 3
  // del resultado anterior no existe en el nuevo.
  function handleSearchChange(value: string) {
    setSearch(value);
    setPagination((previous) => ({ ...previous, pageIndex: 0 }));
  }

  // Estable: las columnas de la tabla se memoizan sobre este callback.
  const handleEditCost = useCallback((product: UnitPriceRow) => {
    setEditingProduct(product);
  }, []);

  // Tras guardar, el listado se invalida: se relee la fila de la respuesta para
  // que el diálogo no muestre el costo viejo del snapshot. Si la fila salió del
  // resultado (cambió de página o de búsqueda), el snapshot es el respaldo.
  const productInDialog =
    editingProduct === null
      ? null
      : (unitPrices.data?.data.find((row) => row.id === editingProduct.id) ??
        editingProduct);

  return (
    <div className="flex flex-col gap-6">
      <UnitPriceToolbar search={search} onSearchChange={handleSearchChange} />

      <UnitPriceTable
        data={unitPrices.data?.data}
        rowCount={unitPrices.data?.meta.total ?? 0}
        pagination={pagination}
        onPaginationChange={setPagination}
        canEditCost={canEditCost}
        onEditCost={handleEditCost}
        isLoading={unitPrices.isPending}
        isError={unitPrices.isError}
        errorMessage={unitPrices.error?.message ?? null}
        onRetry={() => void unitPrices.refetch()}
      />

      {/* Montado solo con un producto elegido y `key` por id: cada apertura
          arranca con el costo vigente de esa fila. */}
      {canEditCost && productInDialog ? (
        <EditCostDialog
          key={productInDialog.id}
          open
          onOpenChange={(next) => {
            if (!next) {
              setEditingProduct(null);
            }
          }}
          product={productInDialog}
        />
      ) : null}
    </div>
  );
}
