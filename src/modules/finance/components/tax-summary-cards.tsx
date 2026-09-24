import { TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCents } from "@/lib/format";
import { cn } from "@/lib/utils";

import { IGV_PERCENT } from "../lib/tax";

import type { TaxTotals } from "../types/tax";

type TaxSummaryCardsProps = {
  /** `undefined` mientras carga o si la consulta falló. */
  totals: TaxTotals | undefined;
  isLoading: boolean;
  isError: boolean;
  errorMessage: string | null;
  onRetry: () => void;
};

type SummaryItem = {
  key: keyof TaxTotals;
  label: string;
};

// El IGV va primero y destacado: es la cifra de esta pantalla. Bruto y neto
// quedan como referencia de dónde sale.
const SECONDARY_ITEMS: SummaryItem[] = [
  { key: "grossCents", label: "Ventas brutas (con IGV)" },
  { key: "netCents", label: "Ventas netas (sin IGV)" },
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
export function TaxSummaryCards({
  totals,
  isLoading,
  isError,
  errorMessage,
  onRetry,
}: TaxSummaryCardsProps) {
  // Sin totales, "—" se leería como "sin ventas": el fallo se dice como fallo.
  if (isError) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
          <TriangleAlert className="size-6 text-destructive" aria-hidden />
          <div>
            <p className="font-medium">No se pudieron cargar los totales.</p>
            <p className="text-sm text-muted-foreground">
              {errorMessage ?? "Ocurrió un error inesperado."}
            </p>
          </div>
          <Button variant="outline" onClick={onRetry}>
            Reintentar
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <Card className="md:col-span-2">
        <CardHeader>
          <CardDescription>IGV de ventas ({IGV_PERCENT} %)</CardDescription>
          <SummaryValue
            value={totals ? formatCents(totals.taxCents) : undefined}
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
              value={totals ? formatCents(totals[item.key]) : undefined}
              isLoading={isLoading}
              className="text-xl"
            />
          </CardHeader>
        </Card>
      ))}
    </div>
  );
}
