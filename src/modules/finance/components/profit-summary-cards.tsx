import { Info, TriangleAlert } from "lucide-react";

import { UnknownValue } from "@/components/shared/unknown-value";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCents, formatPct } from "@/lib/format";
import { cn } from "@/lib/utils";

import { marginPct } from "../lib/margin";
import { IGV_PERCENT } from "../lib/tax";

import type { ProfitTotals } from "../types/profit";

const countFormatter = new Intl.NumberFormat("es-PE");

type ProfitSummaryCardsProps = {
  /** `undefined` mientras carga o si la consulta falló. */
  totals: ProfitTotals | undefined;
  isLoading: boolean;
  isError: boolean;
  errorMessage: string | null;
  onRetry: () => void;
};

type SummaryItem = {
  key: "netCents" | "cogsCents" | "expensesCents";
  label: string;
};

const COMPONENT_ITEMS: SummaryItem[] = [
  { key: "netCents", label: "Ingreso neto (sin IGV)" },
  { key: "cogsCents", label: "Costo de lo vendido" },
  { key: "expensesCents", label: "Egresos" },
];

function SummaryValue({
  value,
  unknownLabel,
  isLoading,
  className,
}: {
  /** `null` es un dato que no existe: se pinta "—" y se lee `unknownLabel`. */
  value: string | null;
  unknownLabel: string;
  isLoading: boolean;
  className?: string;
}) {
  if (isLoading) {
    return <Skeleton className="h-7 w-28" />;
  }

  return (
    <CardTitle className={cn("tabular-nums", className)}>
      {value ?? <UnknownValue label={unknownLabel} />}
    </CardTitle>
  );
}

function isWithoutMovement(totals: ProfitTotals): boolean {
  return (
    totals.grossCents === 0 &&
    totals.cogsCents === 0 &&
    totals.expensesCents === 0 &&
    totals.unitsWithoutCost === 0
  );
}

/**
 * Totales del P&L. Los importes llegan calculados por el servidor; lo único que
 * se deriva acá es el margen neto %, con `marginPct` de 016 sobre los enteros
 * del cable: `marginPct(neto, COGS + egresos)`.
 *
 * El IGV va aparte y rotulado: ya salió al derivar el neto, y ponerlo junto a
 * COGS y egresos invitaría a restarlo otra vez.
 */
export function ProfitSummaryCards({
  totals,
  isLoading,
  isError,
  errorMessage,
  onRetry,
}: ProfitSummaryCardsProps) {
  if (isError) {
    return (
      <Card>
        <CardHeader className="flex flex-col items-center gap-3 text-center">
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
        </CardHeader>
      </Card>
    );
  }

  const isPending = isLoading || totals === undefined;
  const netMarginPct = totals
    ? marginPct(totals.netCents, totals.cogsCents + totals.expensesCents)
    : null;

  return (
    <div className="flex flex-col gap-3">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardDescription>Utilidad del periodo</CardDescription>
            <SummaryValue
              value={totals ? formatCents(totals.profitCents) : null}
              unknownLabel="Utilidad no disponible"
              isLoading={isPending}
              className={cn(
                "text-3xl",
                totals && totals.profitCents < 0 && "text-destructive",
              )}
            />
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>Margen neto</CardDescription>
            <SummaryValue
              value={netMarginPct === null ? null : formatPct(netMarginPct)}
              unknownLabel="Sin margen: no hay ingreso neto en el rango"
              isLoading={isPending}
              className={cn(
                "text-xl",
                netMarginPct !== null && netMarginPct < 0 && "text-destructive",
              )}
            />
          </CardHeader>
        </Card>

        {COMPONENT_ITEMS.map((item) => (
          <Card key={item.key}>
            <CardHeader>
              <CardDescription>{item.label}</CardDescription>
              <SummaryValue
                value={totals ? formatCents(totals[item.key]) : null}
                unknownLabel={`${item.label}: no disponible`}
                isLoading={isPending}
                className="text-xl"
              />
            </CardHeader>
          </Card>
        ))}
      </div>

      {totals && !isLoading ? (
        <div className="flex flex-col gap-2 text-sm text-muted-foreground">
          <p className="flex items-center gap-2">
            <Info className="size-4 shrink-0" aria-hidden />
            <span>
              IGV ({IGV_PERCENT} %) del rango:{" "}
              <span className="font-medium text-foreground tabular-nums">
                {formatCents(totals.taxCents)}
              </span>{" "}
              — referencia, no resta: ya quedó fuera al calcular el neto.
            </span>
          </p>

          {totals.unitsWithoutCost > 0 ? (
            <p role="status" className="flex items-center gap-2">
              <TriangleAlert
                className="size-4 shrink-0 text-destructive"
                aria-hidden
              />
              <span>
                {countFormatter.format(totals.unitsWithoutCost)}{" "}
                {totals.unitsWithoutCost === 1
                  ? "unidad vendida no tiene"
                  : "unidades vendidas no tienen"}{" "}
                costo registrado: quedan fuera del costo de lo vendido y la
                utilidad está sobreestimada.
              </span>
            </p>
          ) : null}

          {isWithoutMovement(totals) ? (
            <p role="status">Sin ventas pagadas ni egresos en este rango.</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
