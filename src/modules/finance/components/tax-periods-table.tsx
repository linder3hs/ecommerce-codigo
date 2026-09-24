import { Info, TriangleAlert } from "lucide-react";

import { Badge } from "@/components/ui/badge";
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

import type { TaxPeriodRow } from "../types/tax";

const COLUMN_COUNT = 4;
const SKELETON_ROWS = 3;

type TaxPeriodsTableProps = {
  rows: TaxPeriodRow[] | undefined;
  /** Sin ventas pagadas en el rango: se avisa, pero las filas en 0 se muestran. */
  isEmpty: boolean;
  isLoading: boolean;
  isError: boolean;
  errorMessage: string | null;
  onRetry: () => void;
};

/**
 * IGV por mes o trimestre. Sin fila de total: neto e IGV no son sumables por
 * filas (cada una se redondea por separado) y el total correcto ya está en las
 * tarjetas. La fila del periodo es la cifra que se declara.
 */
export function TaxPeriodsTable({
  rows,
  isEmpty,
  isLoading,
  isError,
  errorMessage,
  onRetry,
}: TaxPeriodsTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>IGV por periodo</CardTitle>
        <CardDescription>
          Un periodo &quot;Incompleto&quot; está recortado por el rango o
          todavía no ha cerrado: no es declarable.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {isError ? (
          <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed p-10 text-center">
            <TriangleAlert className="size-6 text-destructive" aria-hidden />
            <div>
              <p className="font-medium">No se pudo cargar el reporte.</p>
              <p className="text-sm text-muted-foreground">
                {errorMessage ?? "Ocurrió un error inesperado."}
              </p>
            </div>
            <Button variant="outline" onClick={onRetry}>
              Reintentar
            </Button>
          </div>
        ) : (
          <>
            {!isLoading && isEmpty ? (
              <div
                role="status"
                className="flex items-center gap-2 rounded-lg border border-dashed px-4 py-3 text-sm text-muted-foreground"
              >
                <Info className="size-4 shrink-0" aria-hidden />
                Sin ventas pagadas en este rango: no hay IGV que reportar.
              </div>
            ) : null}

            <div className="overflow-hidden rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Periodo</TableHead>
                    <TableHead className="text-right">Bruto</TableHead>
                    <TableHead className="text-right">Neto</TableHead>
                    <TableHead className="text-right">IGV</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading || rows === undefined
                    ? Array.from({ length: SKELETON_ROWS }).map((_, index) => (
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
                    : rows.map((row) => (
                        <TableRow key={row.key}>
                          <TableCell className="font-medium">
                            <span className="flex items-center gap-2">
                              {row.label}
                              {row.partial ? (
                                <Badge variant="outline">Incompleto</Badge>
                              ) : null}
                            </span>
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {formatCents(row.grossCents)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {formatCents(row.netCents)}
                          </TableCell>
                          <TableCell className="text-right font-medium tabular-nums">
                            {formatCents(row.taxCents)}
                          </TableCell>
                        </TableRow>
                      ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
