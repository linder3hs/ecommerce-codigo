import { PackageOpen, TriangleAlert } from "lucide-react";

import { UnknownValue } from "@/components/shared/unknown-value";
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
import { formatCents, formatPct } from "@/lib/format";
import { cn } from "@/lib/utils";

import { BREAKDOWN_LIMIT } from "../constants";
import { marginCents, marginPct } from "../lib/margin";

import type { ProfitProductRow } from "../types/profit";

const COLUMN_COUNT = 6;
const SKELETON_ROWS = 5;
const countFormatter = new Intl.NumberFormat("es-PE");

// Los "—" de esta fila son `UnknownValue` (AC5): costo desconocido, nunca 0.
function MarginCells({ row }: { row: ProfitProductRow }) {
  const margin = marginCents(row.netCents, row.cogsCents);
  const pct = marginPct(row.netCents, row.cogsCents);

  return (
    <>
      <TableCell className="text-right">
        {row.cogsCents === null ? (
          <UnknownValue label="Costo desconocido: ninguna unidad tiene costo" />
        ) : (
          <span className="tabular-nums">{formatCents(row.cogsCents)}</span>
        )}
      </TableCell>
      <TableCell className="text-right">
        {margin === null ? (
          <UnknownValue label="Sin margen: el costo es desconocido" />
        ) : (
          <span
            className={cn(
              "font-medium tabular-nums",
              margin < 0 && "text-destructive",
            )}
          >
            {formatCents(margin)}
          </span>
        )}
      </TableCell>
      <TableCell className="text-right">
        {pct === null ? (
          <UnknownValue
            label={
              row.cogsCents === null
                ? "Sin margen porcentual: el costo es desconocido"
                : "Sin margen porcentual: el ingreso neto es 0"
            }
          />
        ) : (
          <span className={cn("tabular-nums", pct < 0 && "text-destructive")}>
            {formatPct(pct)}
          </span>
        )}
      </TableCell>
    </>
  );
}

type ProfitProductsTableProps = {
  rows: ProfitProductRow[] | undefined;
  isLoading: boolean;
  isError: boolean;
  errorMessage: string | null;
  onRetry: () => void;
};

/**
 * Margen bruto por producto: neto vendido en el rango contra el costo congelado
 * en cada venta, con `marginCents`/`marginPct` de 016.
 *
 * Sin fila de total: el neto se redondea por fila y el total correcto ya está en
 * las tarjetas. Si solo parte de las unidades de un producto tiene costo, el
 * COGS y el margen son de esa parte y la fila lo marca.
 */
export function ProfitProductsTable({
  rows,
  isLoading,
  isError,
  errorMessage,
  onRetry,
}: ProfitProductsTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Margen bruto por producto</CardTitle>
        <CardDescription>
          Los {BREAKDOWN_LIMIT} productos con más ingreso bruto del rango. El
          costo es el registrado en cada venta.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isError ? (
          <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed p-10 text-center">
            <TriangleAlert className="size-6 text-destructive" aria-hidden />
            <div>
              <p className="font-medium">
                No se pudo cargar el margen por producto.
              </p>
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
                  <TableHead>Producto</TableHead>
                  <TableHead className="text-right">Unidades</TableHead>
                  <TableHead className="text-right">Ingreso neto</TableHead>
                  <TableHead className="text-right">Costo</TableHead>
                  <TableHead className="text-right">Margen</TableHead>
                  <TableHead className="text-right">Margen %</TableHead>
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
                  rows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium">{row.label}</span>
                          {row.unitsWithoutCost > 0 ? (
                            <Badge variant="outline">
                              {countFormatter.format(row.unitsWithoutCost)} sin
                              costo
                            </Badge>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {countFormatter.format(row.units)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatCents(row.netCents)}
                      </TableCell>
                      <MarginCells row={row} />
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
