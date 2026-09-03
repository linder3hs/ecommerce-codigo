"use client";

import {
  useTable,
  type OnChangeFn,
  type PaginationState,
  type SortingState,
} from "@tanstack/react-table";
import {
  ArrowDown,
  ArrowUp,
  ChevronsUpDown,
  FolderOpen,
  TriangleAlert,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { PAGE_SIZE_OPTIONS } from "../constants";
import type { Category } from "../types/category";

import { categoriesColumns, categoriesTableFeatures } from "./categories-columns";

const EMPTY_CATEGORIES: Category[] = [];

type CategoriesTableProps = {
  data: Category[] | undefined;
  rowCount: number;
  pagination: PaginationState;
  onPaginationChange: OnChangeFn<PaginationState>;
  sorting: SortingState;
  onSortingChange: OnChangeFn<SortingState>;
  isLoading: boolean;
  isError: boolean;
  errorMessage: string | null;
  onRetry: () => void;
};

export function CategoriesTable({
  data,
  rowCount,
  pagination,
  onPaginationChange,
  sorting,
  onSortingChange,
  isLoading,
  isError,
  errorMessage,
  onRetry,
}: CategoriesTableProps) {
  const table = useTable({
    features: categoriesTableFeatures,
    columns: categoriesColumns,
    data: data ?? EMPTY_CATEGORIES,
    rowCount,
    manualPagination: true,
    manualSorting: true,
    // El servidor siempre ordena por alguna columna: sin esto el tercer clic
    // borra el indicador visual pero el orden real se mantiene.
    enableSortingRemoval: false,
    state: { pagination, sorting },
    onPaginationChange,
    onSortingChange,
    getRowId: (row) => row.id,
  });

  const rows = table.getRowModel().rows;
  const columnCount = categoriesColumns.length;
  const pageCount = table.getPageCount();

  if (isError) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed p-10 text-center">
        <TriangleAlert className="text-destructive size-6" aria-hidden />
        <div>
          <p className="font-medium">No se pudieron cargar las categorías.</p>
          <p className="text-muted-foreground text-sm">
            {errorMessage ?? "Ocurrió un error inesperado."}
          </p>
        </div>
        <Button variant="outline" onClick={onRetry}>
          Reintentar
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((group) => (
              <TableRow key={group.id}>
                {group.headers.map((header) => {
                  if (header.isPlaceholder) {
                    return <TableHead key={header.id} />;
                  }

                  const canSort = header.column.getCanSort();
                  const sorted = header.column.getIsSorted();

                  return (
                    <TableHead
                      key={header.id}
                      aria-sort={
                        canSort
                          ? sorted === "asc"
                            ? "ascending"
                            : sorted === "desc"
                              ? "descending"
                              : "none"
                          : undefined
                      }
                    >
                      {canSort ? (
                        <button
                          type="button"
                          onClick={header.column.getToggleSortingHandler()}
                          className="hover:text-foreground flex items-center gap-1"
                        >
                          <table.FlexRender header={header} />
                          {sorted === "asc" ? (
                            <ArrowUp className="size-3.5" aria-hidden />
                          ) : sorted === "desc" ? (
                            <ArrowDown className="size-3.5" aria-hidden />
                          ) : (
                            <ChevronsUpDown
                              className="size-3.5 opacity-50"
                              aria-hidden
                            />
                          )}
                        </button>
                      ) : (
                        <table.FlexRender header={header} />
                      )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: pagination.pageSize }).map((_, index) => (
                <TableRow key={`skeleton-${index}`}>
                  {Array.from({ length: columnCount }).map((__, cellIndex) => (
                    <TableCell key={`skeleton-cell-${cellIndex}`}>
                      <Skeleton className="h-6 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columnCount} className="h-40">
                  <div className="text-muted-foreground flex flex-col items-center gap-2 text-center">
                    <FolderOpen className="size-6" aria-hidden />
                    <p className="font-medium">No hay categorías que mostrar.</p>
                    <p className="text-sm">
                      Ajusta la búsqueda o crea una categoría nueva.
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getAllCells().map((cell) => (
                    <TableCell key={cell.id}>
                      <table.FlexRender cell={cell} />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-sm">Filas por página</span>
          <Select
            value={String(pagination.pageSize)}
            onValueChange={(value) => table.setPageSize(Number(value))}
          >
            <SelectTrigger className="w-20" aria-label="Filas por página">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZE_OPTIONS.map((option) => (
                <SelectItem key={option} value={String(option)}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-muted-foreground text-sm">
            Página {pagination.pageIndex + 1} de {Math.max(pageCount, 1)} ·{" "}
            {rowCount} categorías
          </span>
          <Button
            variant="outline"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage() || isLoading}
          >
            Anterior
          </Button>
          <Button
            variant="outline"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage() || isLoading}
          >
            Siguiente
          </Button>
        </div>
      </div>
    </div>
  );
}
