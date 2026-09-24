"use client";

import { useState } from "react";

import { cn } from "@/lib/utils";

import { useRevenueReport } from "../hooks/use-revenue-report";

import { RevenueBreakdownTable } from "./revenue-breakdown-table";
import { RevenueChart } from "./revenue-chart";
import { RevenueSummaryCards } from "./revenue-summary-cards";
import { RevenueToolbar } from "./revenue-toolbar";

import type { RevenueBreakdown } from "../types/revenue";
import type { DateRange } from "@/modules/orders/types/order-history";

type RevenueViewProps = {
  /**
   * Mes en curso resuelto por el Server Component: si lo calculara el cliente,
   * un render cerca de medianoche podría hidratar con otra fecha que la del
   * servidor.
   */
  initialRange: DateRange;
};

/**
 * Única entrada de datos de la pantalla: el hook se llama una sola vez y los
 * tres bloques reciben su rebanada, así que siempre muestran la misma foto.
 */
export function RevenueView({ initialRange }: RevenueViewProps) {
  const [range, setRange] = useState(initialRange);
  const [breakdown, setBreakdown] = useState<RevenueBreakdown>("product");

  const report = useRevenueReport({ ...range, breakdown });

  const errorMessage = report.error?.message ?? null;
  const retry = () => void report.refetch();

  return (
    <div className="flex flex-col gap-6">
      <RevenueToolbar
        range={range}
        onRangeChange={setRange}
        breakdown={breakdown}
        onBreakdownChange={setBreakdown}
      />

      {/* Con `keepPreviousData` el reporte anterior sigue visible mientras
          llega el nuevo: se atenúa para que no se lea como el del filtro
          recién elegido. */}
      <div
        aria-busy={report.isPlaceholderData}
        className={cn(
          "flex flex-col gap-6 transition-opacity",
          report.isPlaceholderData && "opacity-60",
        )}
      >
        <RevenueSummaryCards
          totals={report.data?.totals}
          isLoading={report.isPending}
        />

        <RevenueChart
          data={report.data?.daily}
          isLoading={report.isPending}
          isError={report.isError}
          errorMessage={errorMessage}
          onRetry={retry}
        />

        <RevenueBreakdownTable
          rows={report.data?.breakdown}
          breakdown={breakdown}
          isLoading={report.isPending}
          isError={report.isError}
          errorMessage={errorMessage}
          onRetry={retry}
        />
      </div>
    </div>
  );
}
