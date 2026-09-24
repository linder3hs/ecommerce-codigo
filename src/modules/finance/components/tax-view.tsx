"use client";

import { useState } from "react";

import { cn } from "@/lib/utils";

import { useTaxReport } from "../hooks/use-tax-report";

import { TaxPeriodsTable } from "./tax-periods-table";
import { TaxSummaryCards } from "./tax-summary-cards";
import { TaxToolbar } from "./tax-toolbar";

import type { TaxPeriod } from "../types/tax";
import type { DateRange } from "@/modules/orders/types/order-history";

type TaxViewProps = {
  /**
   * Mes en curso resuelto por el Server Component: si lo calculara el cliente,
   * un render cerca de medianoche podría hidratar con otra fecha que la del
   * servidor.
   */
  initialRange: DateRange;
};

/**
 * Única entrada de datos de la pantalla: el hook se llama una sola vez y
 * tarjetas y tabla reciben su rebanada, así que siempre muestran la misma foto.
 */
export function TaxView({ initialRange }: TaxViewProps) {
  const [range, setRange] = useState(initialRange);
  const [period, setPeriod] = useState<TaxPeriod>("month");

  const report = useTaxReport({ ...range, period });

  const errorMessage = report.error?.message ?? null;
  const retry = () => void report.refetch();

  return (
    <div className="flex flex-col gap-6">
      <TaxToolbar
        range={range}
        onRangeChange={setRange}
        period={period}
        onPeriodChange={setPeriod}
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
        <TaxSummaryCards
          totals={report.data?.totals}
          isLoading={report.isPending}
          isError={report.isError}
          errorMessage={errorMessage}
          onRetry={retry}
        />

        <TaxPeriodsTable
          rows={report.data?.periods}
          isEmpty={report.data?.totals.grossCents === 0}
          isLoading={report.isPending}
          isError={report.isError}
          errorMessage={errorMessage}
          onRetry={retry}
        />
      </div>
    </div>
  );
}
