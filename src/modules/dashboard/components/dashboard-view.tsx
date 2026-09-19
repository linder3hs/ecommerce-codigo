"use client";

import { TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

import { useDashboardMetrics } from "../hooks/use-dashboard-metrics";

import { LowStockTable } from "./low-stock-table";
import { OrdersByStatusChart } from "./orders-by-status-chart";
import { SalesByDayChart } from "./sales-by-day-chart";

/**
 * Única entrada de datos del dashboard: el hook se llama acá una sola vez y los
 * tres widgets reciben su rebanada por props, así que hay un solo polling de 30 s
 * y los tres widgets muestran siempre la misma foto.
 */
export function DashboardView() {
  const metrics = useDashboardMetrics();

  if (metrics.isPending) {
    return (
      <div className="flex flex-col gap-4">
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-80 w-full" />
          <Skeleton className="h-80 w-full" />
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (metrics.isError) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed p-10 text-center">
        <TriangleAlert className="size-6 text-destructive" aria-hidden />
        <div>
          <p className="font-medium">
            No se pudieron cargar las métricas del dashboard.
          </p>
          <p className="text-sm text-muted-foreground">
            {metrics.error?.message ?? "Ocurrió un error inesperado."}
          </p>
        </div>
        <Button variant="outline" onClick={() => void metrics.refetch()}>
          Reintentar
        </Button>
      </div>
    );
  }

  const {
    salesByDay,
    ordersByStatus,
    lowStock,
    windowDays,
    lowStockThreshold,
  } = metrics.data;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <SalesByDayChart data={salesByDay} windowDays={windowDays} />
        <OrdersByStatusChart data={ordersByStatus} />
      </div>
      <LowStockTable data={lowStock} threshold={lowStockThreshold} />
    </div>
  );
}
