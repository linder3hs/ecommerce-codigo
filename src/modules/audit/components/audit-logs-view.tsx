"use client";

import { useCallback, useState } from "react";

import { ALL_FILTER_VALUE, DEFAULT_PAGE_SIZE } from "../constants";
import { useAuditLogs } from "../hooks/use-audit-logs";

import { AuditLogsTable } from "./audit-logs-table";
import { AuditLogsToolbar } from "./audit-logs-toolbar";
import { AuditMetricsSummary } from "./audit-metrics-summary";

import type { AuditLogQueryInput } from "../schemas/audit-log.schema";
import type { AuditLogActor } from "../types/audit-log";
import type { PaginationState } from "@tanstack/react-table";

const FIRST_PAGE: PaginationState = {
  pageIndex: 0,
  pageSize: DEFAULT_PAGE_SIZE,
};

/**
 * El `<input type="date">` da "YYYY-MM-DD" sin zona. El rango se interpreta en
 * la zona de quien mira —desde el primer instante del día hasta el último— y
 * viaja como instante ISO, porque `created_at` es timestamptz.
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

export function AuditLogsView({
  canReadMetrics,
}: {
  // Lo resuelve el Server Component con los permisos efectivos. Es solo
  // presentación: la barrera real es `requirePermission` en cada handler.
  canReadMetrics: boolean;
}) {
  const [entityType, setEntityType] = useState<string>(ALL_FILTER_VALUE);
  const [action, setAction] = useState<string>(ALL_FILTER_VALUE);
  const [actor, setActor] = useState<AuditLogActor | null>(null);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [pagination, setPagination] = useState<PaginationState>(FIRST_PAGE);

  const params: AuditLogQueryInput = {
    page: pagination.pageIndex + 1,
    pageSize: pagination.pageSize,
    entityType: entityType === ALL_FILTER_VALUE ? undefined : entityType,
    action: action === ALL_FILTER_VALUE ? undefined : action,
    actorId: actor?.id,
    dateFrom: dayBoundary(dateFrom, "start"),
    dateTo: dayBoundary(dateTo, "end"),
  };

  const auditLogs = useAuditLogs(params);

  const resetToFirstPage = useCallback(() => {
    setPagination((previous) => ({ ...previous, pageIndex: 0 }));
  }, []);

  // Estable: las columnas de la tabla se memoizan sobre este callback.
  const handleFilterByActor = useCallback(
    (nextActor: AuditLogActor) => {
      setActor(nextActor);
      resetToFirstPage();
    },
    [resetToFirstPage],
  );

  function handleEntityTypeChange(value: string) {
    setEntityType(value);
    resetToFirstPage();
  }

  function handleActionChange(value: string) {
    setAction(value);
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

  function handleClearActor() {
    setActor(null);
    resetToFirstPage();
  }

  return (
    <div className="flex flex-col gap-6">
      {canReadMetrics ? <AuditMetricsSummary /> : null}

      <AuditLogsToolbar
        entityType={entityType}
        onEntityTypeChange={handleEntityTypeChange}
        action={action}
        onActionChange={handleActionChange}
        dateFrom={dateFrom}
        onDateFromChange={handleDateFromChange}
        dateTo={dateTo}
        onDateToChange={handleDateToChange}
        actor={actor}
        onClearActor={handleClearActor}
      />

      <AuditLogsTable
        data={auditLogs.data?.data}
        rowCount={auditLogs.data?.meta.total ?? 0}
        pagination={pagination}
        onPaginationChange={setPagination}
        onFilterByActor={handleFilterByActor}
        isLoading={auditLogs.isPending}
        isError={auditLogs.isError}
        errorMessage={auditLogs.error?.message ?? null}
        onRetry={() => void auditLogs.refetch()}
      />
    </div>
  );
}
