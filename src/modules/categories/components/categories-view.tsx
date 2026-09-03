"use client";

import type {
  OnChangeFn,
  PaginationState,
  SortingState,
} from "@tanstack/react-table";
import { useState } from "react";

import { useDebounce } from "@/hooks/use-debounce";

import {
  DEFAULT_PAGE_SIZE,
  SEARCH_DEBOUNCE_MS,
  type CategoryStatusFilter,
} from "../constants";
import { useCategories } from "../hooks/use-categories";
import type { CategoryQueryInput } from "../schemas/category.schema";

import { CategoriesTable } from "./categories-table";
import { CategoriesToolbar } from "./categories-toolbar";
import { CategoryFormDialog } from "./category-form-dialog";

const SORTABLE_FIELDS = ["name", "createdAt", "updatedAt"] as const;

const FIRST_PAGE: PaginationState = {
  pageIndex: 0,
  pageSize: DEFAULT_PAGE_SIZE,
};

function toSortBy(id: string | undefined): CategoryQueryInput["sortBy"] {
  return SORTABLE_FIELDS.find((field) => field === id) ?? "createdAt";
}

function toIsActive(status: CategoryStatusFilter): boolean | undefined {
  return status === "all" ? undefined : status === "true";
}

export function CategoriesView() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<CategoryStatusFilter>("all");
  const [pagination, setPagination] = useState<PaginationState>(FIRST_PAGE);
  const [sorting, setSorting] = useState<SortingState>([
    { id: "createdAt", desc: true },
  ]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const debouncedSearch = useDebounce(search, SEARCH_DEBOUNCE_MS);

  const params: CategoryQueryInput = {
    page: pagination.pageIndex + 1,
    pageSize: pagination.pageSize,
    search: debouncedSearch.trim() || undefined,
    isActive: toIsActive(status),
    sortBy: toSortBy(sorting[0]?.id),
    sortDir: sorting[0]?.desc === false ? "asc" : "desc",
  };

  const categories = useCategories(params);

  function resetToFirstPage() {
    setPagination((previous) => ({ ...previous, pageIndex: 0 }));
  }

  function handleSearchChange(value: string) {
    setSearch(value);
    resetToFirstPage();
  }

  function handleStatusChange(value: CategoryStatusFilter) {
    setStatus(value);
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
      <CategoriesToolbar
        search={search}
        onSearchChange={handleSearchChange}
        status={status}
        onStatusChange={handleStatusChange}
        onCreate={() => setIsCreateOpen(true)}
      />

      <CategoriesTable
        data={categories.data?.data}
        rowCount={categories.data?.meta.total ?? 0}
        pagination={pagination}
        onPaginationChange={setPagination}
        sorting={sorting}
        onSortingChange={handleSortingChange}
        isLoading={categories.isPending}
        isError={categories.isError}
        errorMessage={categories.error?.message ?? null}
        onRetry={() => void categories.refetch()}
      />

      <CategoryFormDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} />
    </div>
  );
}
