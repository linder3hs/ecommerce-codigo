"use client";

import {
  useTable,
  type OnChangeFn,
  type PaginationState,
} from "@tanstack/react-table";
import { ReceiptText, TriangleAlert } from "lucide-react";
import { useMemo } from "react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PAGE_SIZE_OPTIONS } from "@/modules/products/constants";

import {
  createExpensesColumns,
  expensesTableFeatures,
} from "./expenses-columns";

import type { ExpenseRow } from "../types/expense";

const EMPTY_ROWS: ExpenseRow[] = [];

type ExpensesTableProps = {
  data: ExpenseRow[] | undefined;
  rowCount: number;
  pagination: PaginationState;
  onPaginationChange: OnChangeFn<PaginationState>;
  canUpdate: boolean;
  canDelete: boolean;
  onEdit: (expense: ExpenseRow) => void;
  onDelete: (expense: ExpenseRow) => void;
  hasFilters: boolean;
  isLoading: boolean;
  isError: boolean;
  errorMessage: string | null;
  onRetry: () => void;
};

export function ExpensesTable({
  data,
  rowCount,
  pagination,
  onPaginationChange,
  canUpdate,
  canDelete,
  onEdit,
  onDelete,
  hasFilters,
  isLoading,
  isError,
  errorMessage,
  onRetry,
}: ExpensesTableProps) {
  const columns = useMemo(
    () => createExpensesColumns({ canUpdate, canDelete, onEdit, onDelete }),
    [canUpdate, canDelete, onEdit, onDelete],
  );

  const table = useTable({
    features: expensesTableFeatures,
    columns,
    data: data ?? EMPTY_ROWS,
    rowCount,
    // La página la resuelve el servidor: la tabla solo refleja `pagination` y
    // avisa al padre, que es quien rehace la query.
    manualPagination: true,
    state: { pagination },
    onPaginationChange,
    getRowId: (row) => row.id,
  });

  const rows = table.getRowModel().rows;
  // Varía con los permisos: la columna de acciones no siempre existe.
  const columnCount = columns.length;
  const pageCount = table.getPageCount();

  if (isError) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed p-10 text-center">
        <TriangleAlert className="size-6 text-destructive" aria-hidden />
        <div>
          <p className="font-medium">No se pudieron cargar los egresos.</p>
          <p className="text-sm text-muted-foreground">
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
                {group.headers.map((header) =>
                  header.isPlaceholder ? (
                    <TableHead key={header.id} />
                  ) : (
                    <TableHead key={header.id}>
                      <table.FlexRender header={header} />
                    </TableHead>
                  ),
                )}
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
                  <div className="flex flex-col items-center gap-2 text-center text-muted-foreground">
                    <ReceiptText className="size-6" aria-hidden />
                    <p className="font-medium">No hay egresos que mostrar.</p>
                    <p className="text-sm">
                      {hasFilters
                        ? "Ajusta la categoría o el rango de fechas."
                        : "Todavía no se registró ningún gasto operativo."}
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
          <span className="text-sm text-muted-foreground">
            Filas por página
          </span>
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
          <span className="text-sm text-muted-foreground">
            Página {pagination.pageIndex + 1} de {Math.max(pageCount, 1)} ·{" "}
            {rowCount} egresos
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
