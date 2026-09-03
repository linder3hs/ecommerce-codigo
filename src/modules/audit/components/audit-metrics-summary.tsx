"use client";

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

import { METRICS_WINDOW_DAYS, severityLabel } from "../constants";
import { useMetrics } from "../hooks/use-metrics";

const numberFormatter = new Intl.NumberFormat("es");

function MetricRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-muted-foreground truncate">{label}</span>
      <span className="font-medium tabular-nums">
        {numberFormatter.format(value)}
      </span>
    </div>
  );
}

export function AuditMetricsSummary() {
  const metrics = useMetrics();

  if (metrics.isPending) {
    return (
      <div className="grid gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={`metric-skeleton-${index}`} className="h-40 w-full" />
        ))}
      </div>
    );
  }

  if (metrics.isError) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed p-6 text-center">
        <TriangleAlert className="text-destructive size-5" aria-hidden />
        <div>
          <p className="text-sm font-medium">
            No se pudieron cargar las métricas.
          </p>
          <p className="text-muted-foreground text-sm">
            {metrics.error?.message ?? "Ocurrió un error inesperado."}
          </p>
        </div>
        <Button variant="outline" onClick={() => void metrics.refetch()}>
          Reintentar
        </Button>
      </div>
    );
  }

  const { users, auditLogs } = metrics.data;

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card>
        <CardHeader>
          <CardDescription>Usuarios registrados</CardDescription>
          <CardTitle className="text-3xl tabular-nums">
            {numberFormatter.format(users.total)}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <MetricRow label="Activos" value={users.active} />
          <MetricRow label="Inactivos" value={users.inactive} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardDescription>Usuarios por rol</CardDescription>
          <CardTitle className="text-base">Distribución actual</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {users.byRole.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Todavía no hay usuarios registrados.
            </p>
          ) : (
            users.byRole.map((row) => (
              <MetricRow
                key={row.roleId ?? "sin-rol"}
                // Sin fila en `user_roles` la persona es cliente por defecto.
                label={row.roleName ?? "Cliente (sin rol asignado)"}
                value={row.total}
              />
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardDescription>
            Actividad de los últimos {METRICS_WINDOW_DAYS} días
          </CardDescription>
          <CardTitle className="text-3xl tabular-nums">
            {numberFormatter.format(auditLogs.total)}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {auditLogs.bySeverity.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Sin actividad registrada en la ventana.
            </p>
          ) : (
            auditLogs.bySeverity.map((row) => (
              <MetricRow
                key={row.severity}
                label={severityLabel(row.severity)}
                value={row.total}
              />
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
