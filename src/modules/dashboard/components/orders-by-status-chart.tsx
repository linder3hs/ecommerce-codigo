"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

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

import type { OrdersByStatusPoint } from "../types/dashboard";
import type { OrderStatus } from "@/modules/checkout/types/order";

const numberFormatter = new Intl.NumberFormat("es");

// Mapa cerrado sobre `OrderStatus`: un estado nuevo en el enum rompe la
// compilación en vez de dibujar una barra sin etiqueta.
const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "Pendientes",
  paid: "Pagadas",
  payment_failed: "Fallidas",
};

const chartConfig = {
  total: { label: "Órdenes", color: "var(--chart-1)" },
} satisfies ChartConfig;

function toStatusLabel(status: unknown): string | null {
  return typeof status === "string" && status in STATUS_LABELS
    ? STATUS_LABELS[status as OrderStatus]
    : null;
}

type OrdersByStatusChartProps = {
  data: OrdersByStatusPoint[];
};

/**
 * Conteo de órdenes por estado. Los tres estados llegan siempre desde el
 * servidor (en 0 si no hay órdenes), así que el eje X es estable entre refrescos.
 */
export function OrdersByStatusChart({ data }: OrdersByStatusChartProps) {
  const total = data.reduce((sum, point) => sum + point.total, 0);

  return (
    <Card>
      <CardHeader>
        <CardDescription>Órdenes por estado</CardDescription>
        <CardTitle className="text-2xl tabular-nums">
          {numberFormatter.format(total)}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-64 w-full"
        >
          <BarChart
            accessibilityLayer
            data={data}
            margin={{ left: 4, right: 12 }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="status"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value: string) => toStatusLabel(value) ?? value}
            />
            <YAxis
              dataKey="total"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              width={44}
              allowDecimals={false}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  labelFormatter={(label: unknown) => toStatusLabel(label)}
                  formatter={(value) =>
                    typeof value === "number"
                      ? numberFormatter.format(value)
                      : null
                  }
                />
              }
            />
            <Bar dataKey="total" fill="var(--color-total)" radius={4} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
