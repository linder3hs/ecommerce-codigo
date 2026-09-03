"use client";

import {
  useTable,
  type OnChangeFn,
  type PaginationState,
} from "@tanstack/react-table";
import {
  ChevronDown,
  ChevronRight,
  ScrollText,
  TriangleAlert,
} from "lucide-react";
import { Fragment, useMemo, useState } from "react";

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

import { PAGE_SIZE_OPTIONS } from "../constants";

import { AuditLogDetails } from "./audit-log-details";
import {
  auditLogsTableFeatures,
  createAuditLogsColumns,
} from "./audit-logs-columns";

import type { AuditLogActor, AuditLogListItem } from "../types/audit-log";

const EMPTY_LOGS: AuditLogListItem[] = [];

type AuditLogsTableProps = {
  data: AuditLogListItem[] | undefined;
  rowCount: number;
  pagination: PaginationState;
  onPaginationChange: OnChangeFn<PaginationState>;
  onFilterByActor: (actor: AuditLogActor) => void;
  isLoading: boolean;
  isError: boolean;
  errorMessage: string | null;
  onRetry: () => void;
};

export function AuditLogsTable({
  data,
  rowCount,
  pagination,
  onPaginationChange,
  onFilterByActor,
  isLoading,
  isError,
  errorMessage,
  onRetry,
}: AuditLogsTableProps) {
  // La expansión es estado de presentación de esta tabla y muere con ella: no
  // viaja al servidor ni forma parte de la query.
  const [expandedIds, setExpandedIds] = useState<ReadonlySet<string>>(
    () => new Set(),
  );

  const columns = useMemo(
    () => createAuditLogsColumns(onFilterByActor),
    [onFilterByActor],
  );

  const table = useTable({
    features: auditLogsTableFeatures,
    columns,
    data: data ?? EMPTY_LOGS,
    rowCount,
    manualPagination: true,
    state: { pagination },
    onPaginationChange,
    getRowId: (row) => row.id,
  });

  const rows = table.getRowModel().rows;
  // La columna del control de expansión no es una columna de datos: se dibuja
  // en el marcado porque depende del estado local de la tabla.
  const columnCount = columns.length + 1;
  const pageCount = table.getPageCount();

  function toggleRow(id: string) {
    setExpandedIds((previous) => {
      const next = new Set(previous);

      if (!next.delete(id)) {
        next.add(id);
      }

      return next;
    });
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed p-10 text-center">
        <TriangleAlert className="text-destructive size-6" aria-hidden />
        <div>
          <p className="font-medium">
            No se pudo cargar el registro de auditoría.
          </p>
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
                <TableHead className="w-10">
                  <span className="sr-only">Detalle</span>
                </TableHead>
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
                  <div className="text-muted-foreground flex flex-col items-center gap-2 text-center">
                    <ScrollText className="size-6" aria-hidden />
                    <p className="font-medium">
                      No hay actividad registrada que mostrar.
                    </p>
                    <p className="text-sm">
                      Ajusta los filtros o amplía el rango de fechas.
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => {
                const isExpanded = expandedIds.has(row.id);

                return (
                  <Fragment key={row.id}>
                    <TableRow>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8"
                          aria-expanded={isExpanded}
                          aria-controls={`audit-log-details-${row.id}`}
                          aria-label={
                            isExpanded ? "Ocultar detalle" : "Ver detalle"
                          }
                          onClick={() => toggleRow(row.id)}
                        >
                          {isExpanded ? (
                            <ChevronDown className="size-4" aria-hidden />
                          ) : (
                            <ChevronRight className="size-4" aria-hidden />
                          )}
                        </Button>
                      </TableCell>
                      {row.getAllCells().map((cell) => (
                        <TableCell key={cell.id}>
                          <table.FlexRender cell={cell} />
                        </TableCell>
                      ))}
                    </TableRow>

                    {isExpanded ? (
                      <TableRow className="hover:bg-transparent">
                        <TableCell
                          colSpan={columnCount}
                          id={`audit-log-details-${row.id}`}
                          className="bg-muted/30 p-4"
                        >
                          <AuditLogDetails log={row.original} />
                        </TableCell>
                      </TableRow>
                    ) : null}
                  </Fragment>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-sm">
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
          <span className="text-muted-foreground text-sm">
            Página {pagination.pageIndex + 1} de {Math.max(pageCount, 1)} ·{" "}
            {rowCount} registros
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
