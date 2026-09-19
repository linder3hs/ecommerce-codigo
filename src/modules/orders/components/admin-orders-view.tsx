"use client";

import { useCallback, useState } from "react";

import { useDebounce } from "@/hooks/use-debounce";

import {
  ALL_FILTER_VALUE,
  DEFAULT_PAGE_SIZE,
  SEARCH_DEBOUNCE_MS,
  type OrderStatusFilter,
} from "../constants";
import { useAdminOrders } from "../hooks/use-admin-orders";

import { AdminOrderDetailDialog } from "./admin-order-detail-dialog";
import { AdminOrdersTable } from "./admin-orders-table";
import { AdminOrdersToolbar } from "./admin-orders-toolbar";

import type { AdminOrderQueryInput } from "../schemas/admin-order.schema";
import type { AdminOrderListItem } from "../types/admin-order";
import type { PaginationState } from "@tanstack/react-table";

const FIRST_PAGE: PaginationState = {
  pageIndex: 0,
  pageSize: DEFAULT_PAGE_SIZE,
};

/**
 * El `<input type="date">` da "YYYY-MM-DD" sin zona. El rango se interpreta en la
 * zona de quien mira —del primer al último instante del día— y viaja como
 * instante ISO, porque `created_at` es timestamptz. Mismo criterio que
 * `audit-logs-view.tsx`, y no el día civil de la tienda del historial de cliente.
 */
function dayBoundary(value: string, edge: "start" | "end"): Date | undefined {
  const [year, month, day] = value.split("-").map(Number);

  if (!year || !month || !day) {
    return undefined;
  }

  return edge === "start"
    ? new Date(year, month - 1, day, 0, 0, 0, 0)
    : new Date(year, month - 1, day, 23, 59, 59, 999);
}

export function AdminOrdersView({
  canUpdateStatus,
}: {
  // Lo resuelve el Server Component con los permisos efectivos. Es solo
  // presentación: la barrera real es `requirePermission` en el handler.
  canUpdateStatus: boolean;
}) {
  const [status, setStatus] = useState<OrderStatusFilter>(ALL_FILTER_VALUE);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [pagination, setPagination] = useState<PaginationState>(FIRST_PAGE);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  // La búsqueda se debounce acá y no en el toolbar: el toolbar emite el texto
  // crudo y la query se rehace recién cuando el admin deja de escribir.
  const debouncedSearch = useDebounce(customerSearch, SEARCH_DEBOUNCE_MS);

  const params: AdminOrderQueryInput = {
    page: pagination.pageIndex + 1,
    pageSize: pagination.pageSize,
    status: status === ALL_FILTER_VALUE ? undefined : status,
    customerSearch: debouncedSearch.trim() || undefined,
    dateFrom: dayBoundary(dateFrom, "start"),
    dateTo: dayBoundary(dateTo, "end"),
  };

  const orders = useAdminOrders(params);

  // Cualquier filtro nuevo invalida la página en la que estaba el admin: la
  // página 3 del resultado anterior no existe en el nuevo (AC2).
  const resetToFirstPage = useCallback(() => {
    setPagination((previous) => ({ ...previous, pageIndex: 0 }));
  }, []);

  function handleStatusChange(value: OrderStatusFilter) {
    setStatus(value);
    resetToFirstPage();
  }

  function handleDateFromChange(value: string) {
    setDateFrom(value);
    resetToFirstPage();
  }

  function handleDateToChange(value: string) {
    setDateTo(value);
    resetToFirstPage();
  }

  function handleCustomerSearchChange(value: string) {
    setCustomerSearch(value);
    resetToFirstPage();
  }

  // Estable: las columnas de la tabla se memoizan sobre este callback.
  const handleView = useCallback((order: AdminOrderListItem) => {
    setSelectedOrderId(order.id);
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <AdminOrdersToolbar
        status={status}
        onStatusChange={handleStatusChange}
        dateFrom={dateFrom}
        onDateFromChange={handleDateFromChange}
        dateTo={dateTo}
        onDateToChange={handleDateToChange}
        customerSearch={customerSearch}
        onCustomerSearchChange={handleCustomerSearchChange}
      />

      <AdminOrdersTable
        data={orders.data?.data}
        rowCount={orders.data?.meta.total ?? 0}
        pagination={pagination}
        onPaginationChange={setPagination}
        onView={handleView}
        isLoading={orders.isPending}
        isError={orders.isError}
        errorMessage={orders.error?.message ?? null}
        onRetry={() => void orders.refetch()}
      />

      {/* Montado siempre: con `orderId` vacío el hook del detalle no consulta y
          el diálogo cerrado conserva su animación de salida. */}
      <AdminOrderDetailDialog
        orderId={selectedOrderId ?? ""}
        open={selectedOrderId !== null}
        onOpenChange={(next) => {
          if (!next) {
            setSelectedOrderId(null);
          }
        }}
        canUpdateStatus={canUpdateStatus}
      />
    </div>
  );
}
