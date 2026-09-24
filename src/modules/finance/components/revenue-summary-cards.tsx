import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCents } from "@/lib/format";
import { cn } from "@/lib/utils";

import { IGV_PERCENT } from "../lib/tax";

import type { RevenueTotals } from "../types/revenue";

const countFormatter = new Intl.NumberFormat("es-PE");

type RevenueSummaryCardsProps = {
  /** `undefined` mientras carga o si la consulta falló. */
  totals: RevenueTotals | undefined;
  isLoading: boolean;
};

type SummaryItem = {
  key: keyof RevenueTotals;
  label: string;
  format: (value: number) => string;
};

// El neto va primero y destacado: es el ingreso real de la tienda. Bruto e IGV
// quedan como referencia de dónde sale.
const SECONDARY_ITEMS: SummaryItem[] = [
  { key: "grossCents", label: "Ingreso bruto (con IGV)", format: formatCents },
  { key: "taxCents", label: `IGV (${IGV_PERCENT} %)`, format: formatCents },
  {
    key: "orders",
    label: "Órdenes pagadas",
    format: (value) => countFormatter.format(value),
  },
  {
    key: "units",
    label: "Unidades vendidas",
    format: (value) => countFormatter.format(value),
  },
];

function SummaryValue({
  value,
  isLoading,
  className,
}: {
  value: string | undefined;
  isLoading: boolean;
  className?: string;
}) {
  if (isLoading) {
    return <Skeleton className="h-7 w-28" />;
  }

  return (
    <CardTitle className={cn("tabular-nums", className)}>
      {value ?? "—"}
    </CardTitle>
  );
}

/**
 * Totales del rango. Los valores llegan ya calculados por el servidor: acá no
 * se suma ni se deriva nada, solo se formatea.
 */
export function RevenueSummaryCards({
  totals,
  isLoading,
}: RevenueSummaryCardsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
      <Card className="md:col-span-2">
        <CardHeader>
          <CardDescription>Ingreso neto (sin IGV)</CardDescription>
          <SummaryValue
            value={totals ? formatCents(totals.netCents) : undefined}
            isLoading={isLoading}
            className="text-3xl"
          />
        </CardHeader>
      </Card>

      {SECONDARY_ITEMS.map((item) => (
        <Card key={item.key}>
          <CardHeader>
            <CardDescription>{item.label}</CardDescription>
            <SummaryValue
              value={totals ? item.format(totals[item.key]) : undefined}
              isLoading={isLoading}
              className="text-xl"
            />
          </CardHeader>
        </Card>
      ))}
    </div>
  );
}
