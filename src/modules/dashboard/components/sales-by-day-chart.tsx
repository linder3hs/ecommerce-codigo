"use client";

import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";

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
import { formatCents } from "@/lib/format";

import type { SalesByDayPoint } from "../types/dashboard";

const chartConfig = {
  totalCents: { label: "Ventas", color: "var(--chart-1)" },
} satisfies ChartConfig;

/**
 * `day` llega como día civil en UTC (`YYYY-MM-DD`). Se corta el string en vez de
 * construir un `Date`: `new Date("2026-09-16")` es medianoche UTC y cualquier
 * formateo local al oeste de Greenwich correría los 30 puntos un día atrás.
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

type SalesByDayChartProps = {
  data: SalesByDayPoint[];
  windowDays: number;
};

/**
 * Ventas pagadas por día. La serie llega siempre completa desde el servidor
 * (días sin órdenes vienen en 0), así que la línea no tiene huecos y acá no se
 * rellena nada.
 */
export function SalesByDayChart({ data, windowDays }: SalesByDayChartProps) {
  const total = data.reduce((sum, point) => sum + point.totalCents, 0);

  return (
    <Card>
      <CardHeader>
        <CardDescription>
          Ventas de los últimos {windowDays} días
        </CardDescription>
        <CardTitle className="text-2xl tabular-nums">
          {formatCents(total)}
        </CardTitle>
      </CardHeader>
      <CardContent>
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
              dataKey="totalCents"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              width={88}
              tickFormatter={(value: number) => formatCents(value)}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  labelFormatter={(label: unknown) =>
                    typeof label === "string" ? toFullDay(label) : null
                  }
                  formatter={(value) =>
                    typeof value === "number" ? formatCents(value) : null
                  }
                />
              }
            />
            <Line
              dataKey="totalCents"
              type="monotone"
              stroke="var(--color-totalCents)"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
