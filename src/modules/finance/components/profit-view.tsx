"use client";

import { useState } from "react";

import { cn } from "@/lib/utils";

import { useProfitReport } from "../hooks/use-profit-report";

import { ProfitChart } from "./profit-chart";
import { ProfitProductsTable } from "./profit-products-table";
import { ProfitSummaryCards } from "./profit-summary-cards";
import { ProfitToolbar } from "./profit-toolbar";

import type { DateRange } from "@/modules/orders/types/order-history";

type ProfitViewProps = {
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
export function ProfitView({ initialRange }: ProfitViewProps) {
  const [range, setRange] = useState(initialRange);

  const report = useProfitReport(range);

  const errorMessage = report.error?.message ?? null;
  const retry = () => void report.refetch();

  return (
    <div className="flex flex-col gap-6">
      <ProfitToolbar range={range} onRangeChange={setRange} />

      {/* Con `keepPreviousData` el reporte anterior sigue visible mientras
          llega el nuevo: se atenúa para que no se lea como el del rango
          recién elegido. */}
      <div
        aria-busy={report.isPlaceholderData}
        className={cn(
          "flex flex-col gap-6 transition-opacity",
          report.isPlaceholderData && "opacity-60",
        )}
      >
        <ProfitSummaryCards
          totals={report.data?.totals}
          isLoading={report.isPending}
          isError={report.isError}
          errorMessage={errorMessage}
          onRetry={retry}
        />

        <ProfitChart
          data={report.data?.daily}
          isLoading={report.isPending}
          isError={report.isError}
          errorMessage={errorMessage}
          onRetry={retry}
        />

        <ProfitProductsTable
          rows={report.data?.byProduct}
          isLoading={report.isPending}
          isError={report.isError}
          errorMessage={errorMessage}
          onRetry={retry}
        />
      </div>
    </div>
  );
}
