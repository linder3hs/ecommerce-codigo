import { PackageOpen, TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCents } from "@/lib/format";

import { BREAKDOWN_LIMIT, REVENUE_BREAKDOWNS } from "../constants";

import type { RevenueBreakdown, RevenueBreakdownRow } from "../types/revenue";

const COLUMN_COUNT = 4;
const SKELETON_ROWS = 5;
const countFormatter = new Intl.NumberFormat("es-PE");

type RevenueBreakdownTableProps = {
  rows: RevenueBreakdownRow[] | undefined;
  breakdown: RevenueBreakdown;
  isLoading: boolean;
  isError: boolean;
  errorMessage: string | null;
  onRetry: () => void;
};

/**
 * "Otros" siempre al final aunque el servidor ya lo entregue así: es un resumen
 * del resto, no un competidor del top, y no puede quedar entre dos filas.
 */
function othersLast(rows: RevenueBreakdownRow[]): RevenueBreakdownRow[] {
  return [
    ...rows.filter((row) => row.id !== null),
    ...rows.filter((row) => row.id === null),
  ];
}

/**
 * Desglose del ingreso por producto o categoría. Sin fila de total: el neto no
 * es sumable por filas (cada una se redondea por separado) y el total correcto
 * ya está en las tarjetas.
 */
export function RevenueBreakdownTable({
  rows,
  breakdown,
  isLoading,
  isError,
  errorMessage,
  onRetry,
}: RevenueBreakdownTableProps) {
  const axisLabel =
    REVENUE_BREAKDOWNS.find((option) => option.value === breakdown)?.label ??
    breakdown;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Desglose por {axisLabel.toLowerCase()}</CardTitle>
        <CardDescription>
          Los {BREAKDOWN_LIMIT} con más ingreso bruto; el resto se agrupa en
          &quot;Otros&quot;.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isError ? (
          <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed p-10 text-center">
            <TriangleAlert className="size-6 text-destructive" aria-hidden />
            <div>
              <p className="font-medium">No se pudo cargar el desglose.</p>
              <p className="text-sm text-muted-foreground">
                {errorMessage ?? "Ocurrió un error inesperado."}
              </p>
            </div>
            <Button variant="outline" onClick={onRetry}>
              Reintentar
            </Button>
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{axisLabel}</TableHead>
                  <TableHead className="text-right">Unidades</TableHead>
                  <TableHead className="text-right">Bruto</TableHead>
                  <TableHead className="text-right">Neto</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading || rows === undefined ? (
                  Array.from({ length: SKELETON_ROWS }).map((_, index) => (
                    <TableRow key={`skeleton-${index}`}>
                      {Array.from({ length: COLUMN_COUNT }).map(
                        (__, cellIndex) => (
                          <TableCell key={`skeleton-cell-${cellIndex}`}>
                            <Skeleton className="h-6 w-full" />
                          </TableCell>
                        ),
                      )}
                    </TableRow>
                  ))
                ) : rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={COLUMN_COUNT} className="h-40">
                      <div className="flex flex-col items-center gap-2 text-center text-muted-foreground">
                        <PackageOpen className="size-6" aria-hidden />
                        <p className="font-medium">
                          Sin ventas pagadas en este rango.
                        </p>
                        <p className="text-sm">Prueba con otras fechas.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  othersLast(rows).map((row) => (
                    <TableRow key={row.id ?? "others"}>
                      <TableCell
                        className={
                          row.id === null
                            ? "text-muted-foreground italic"
                            : "font-medium"
                        }
                      >
                        {row.label}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {countFormatter.format(row.units)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatCents(row.grossCents)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatCents(row.netCents)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
