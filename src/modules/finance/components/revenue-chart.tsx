"use client";

import { ChartNoAxesColumn, TriangleAlert } from "lucide-react";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCents } from "@/lib/format";

import type { RevenueDailyPoint } from "../types/revenue";

const chartConfig = {
  netCents: { label: "Neto", color: "var(--chart-1)" },
  grossCents: { label: "Bruto", color: "var(--chart-2)" },
} satisfies ChartConfig;

function seriesLabel(name: unknown): string {
  return name === "netCents" || name === "grossCents"
    ? chartConfig[name].label
    : String(name ?? "");
}

/**
 * `day` llega como día civil de la tienda (`YYYY-MM-DD`). Se corta el string en
 * vez de construir un `Date`: `new Date("2026-09-16")` es medianoche UTC y
 * cualquier formateo local al oeste de Greenwich correría la serie un día atrás.
 */
function toDayParts(day: string) {
  return {
    day: day.slice(8, 10),
    month: day.slice(5, 7),
    year: day.slice(0, 4),
  };
}

function toShortDay(day: string): string {
  const parts = toDayParts(day);

  return `${parts.day}/${parts.month}`;
}

function toFullDay(day: string): string {
  const parts = toDayParts(day);

  return `${parts.day}/${parts.month}/${parts.year}`;
}

type RevenueChartProps = {
  data: RevenueDailyPoint[] | undefined;
  isLoading: boolean;
  isError: boolean;
  errorMessage: string | null;
  onRetry: () => void;
};

/**
 * Ingreso neto por día de la tienda. La serie llega completa desde el servidor
 * (días sin ventas en 0), así que acá no se rellena nada.
 *
 * El bruto es una línea oculta: no se dibuja para no competir con el neto, pero
 * `includeHidden` lo mete en el tooltip como referencia.
 */
export function RevenueChart({
  data,
  isLoading,
  isError,
  errorMessage,
  onRetry,
}: RevenueChartProps) {
  const isEmpty =
    data !== undefined && data.every((point) => point.grossCents === 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ingreso neto por día</CardTitle>
        <CardDescription>
          Días según la hora de Lima. Pasa el cursor para ver el bruto.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isError ? (
          <div className="flex h-64 flex-col items-center justify-center gap-3 text-center">
            <TriangleAlert className="size-6 text-destructive" aria-hidden />
            <div>
              <p className="font-medium">No se pudo cargar la serie diaria.</p>
              <p className="text-sm text-muted-foreground">
                {errorMessage ?? "Ocurrió un error inesperado."}
              </p>
            </div>
            <Button variant="outline" onClick={onRetry}>
              Reintentar
            </Button>
          </div>
        ) : isLoading || data === undefined ? (
          <Skeleton className="h-64 w-full" />
        ) : isEmpty ? (
          <div className="flex h-64 flex-col items-center justify-center gap-2 text-center text-muted-foreground">
            <ChartNoAxesColumn className="size-6" aria-hidden />
            <p className="font-medium">Sin ventas pagadas en este rango.</p>
            <p className="text-sm">Prueba con otras fechas.</p>
          </div>
        ) : (
          <ChartContainer
            config={chartConfig}
            className="aspect-auto h-64 w-full"
          >
            <LineChart
              accessibilityLayer
              data={data}
              margin={{ left: 4, right: 12 }}
            >
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="day"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={24}
                tickFormatter={toShortDay}
              />
              <YAxis
                dataKey="netCents"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                width={88}
                tickFormatter={(value: number) => formatCents(value)}
              />
              <ChartTooltip
                includeHidden
                content={
                  <ChartTooltipContent
                    labelFormatter={(label: unknown) =>
                      typeof label === "string" ? toFullDay(label) : null
                    }
                    // El `formatter` reemplaza la fila entera del tooltip:
                    // se pinta la etiqueta y el monto en soles, no los
                    // centavos crudos del render por defecto.
                    formatter={(value, name) => (
                      <div className="flex flex-1 items-center justify-between gap-4 leading-none">
                        <span className="text-muted-foreground">
                          {seriesLabel(name)}
                        </span>
                        <span className="font-mono font-medium text-foreground tabular-nums">
                          {typeof value === "number" ? formatCents(value) : ""}
                        </span>
                      </div>
                    )}
                  />
                }
              />
              <Line
                dataKey="netCents"
                type="monotone"
                stroke="var(--color-netCents)"
                strokeWidth={2}
                dot={false}
              />
              <Line dataKey="grossCents" hide />
            </LineChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
