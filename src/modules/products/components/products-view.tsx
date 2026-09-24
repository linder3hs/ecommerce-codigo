"use client";

import type {
  OnChangeFn,
  PaginationState,
  SortingState,
} from "@tanstack/react-table";
import { useState } from "react";

import { useDebounce } from "@/hooks/use-debounce";

import {
  ALL_CATEGORIES,
  DEFAULT_PAGE_SIZE,
  PRODUCT_SORTABLE_FIELDS,
  SEARCH_DEBOUNCE_MS,
  type ProductStatusFilter,
} from "../constants";
import { useProducts } from "../hooks/use-products";
import type { ProductQueryInput } from "../schemas/product.schema";

import { ProductFormDialog } from "./product-form-dialog";
import { ProductsTable } from "./products-table";
import { ProductsToolbar } from "./products-toolbar";

const FIRST_PAGE: PaginationState = {
  pageIndex: 0,
  pageSize: DEFAULT_PAGE_SIZE,
};

function toSortBy(id: string | undefined): ProductQueryInput["sortBy"] {
  return PRODUCT_SORTABLE_FIELDS.find((field) => field === id) ?? "createdAt";
}

function toIsActive(status: ProductStatusFilter): boolean | undefined {
  return status === "all" ? undefined : status === "true";
}

export function ProductsView({
  canEditCost,
}: {
  // Lo resuelve el Server Component con los permisos efectivos y baja hasta el
  // formulario, que es quien dibuja o no el campo Costo (AC6). La barrera real
  // es el 403 del handler ante un `costCents` numérico.
  canEditCost: boolean;
}) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<ProductStatusFilter>("all");
  const [categoryId, setCategoryId] = useState<string>(ALL_CATEGORIES);
  const [pagination, setPagination] = useState<PaginationState>(FIRST_PAGE);
  const [sorting, setSorting] = useState<SortingState>([
    { id: "createdAt", desc: true },
  ]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const debouncedSearch = useDebounce(search, SEARCH_DEBOUNCE_MS);

  const params: ProductQueryInput = {
    page: pagination.pageIndex + 1,
    pageSize: pagination.pageSize,
    search: debouncedSearch.trim() || undefined,
    isActive: toIsActive(status),
    categoryId: categoryId === ALL_CATEGORIES ? undefined : categoryId,
    sortBy: toSortBy(sorting[0]?.id),
    sortDir: sorting[0]?.desc === false ? "asc" : "desc",
  };

  const products = useProducts(params);

  function resetToFirstPage() {
    setPagination((previous) => ({ ...previous, pageIndex: 0 }));
  }

  function handleSearchChange(value: string) {
    setSearch(value);
    resetToFirstPage();
  }

  function handleStatusChange(value: ProductStatusFilter) {
    setStatus(value);
    resetToFirstPage();
  }

  function handleCategoryChange(value: string) {
    setCategoryId(value);
    resetToFirstPage();
  }

  const handleSortingChange: OnChangeFn<SortingState> = (updater) => {
    setSorting((previous) =>
      typeof updater === "function" ? updater(previous) : updater,
    );
    resetToFirstPage();
  };

  return (
    <div className="flex flex-col gap-6">
      <ProductsToolbar
        search={search}
        onSearchChange={handleSearchChange}
        status={status}
        onStatusChange={handleStatusChange}
        categoryId={categoryId}
        onCategoryChange={handleCategoryChange}
        onCreate={() => setIsCreateOpen(true)}
      />

      <ProductsTable
        data={products.data?.data}
        rowCount={products.data?.meta.total ?? 0}
        pagination={pagination}
        onPaginationChange={setPagination}
        sorting={sorting}
        onSortingChange={handleSortingChange}
        canEditCost={canEditCost}
        isLoading={products.isPending}
        isError={products.isError}
        errorMessage={products.error?.message ?? null}
        onRetry={() => void products.refetch()}
      />

      <ProductFormDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        canEditCost={canEditCost}
      />
    </div>
  );
}
