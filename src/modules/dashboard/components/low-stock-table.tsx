import { PackageCheck } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import type { LowStockProduct } from "../types/dashboard";

const COLUMN_COUNT = 3;

type LowStockTableProps = {
  data: LowStockProduct[];
  threshold: number;
};

/**
 * Tabla de solo lectura: el reabastecimiento es otro spec, así que acá no hay
 * acciones por fila. Sin `"use client"` porque no usa hooks ni eventos; el
 * padre ya es cliente y esto solo pinta props.
 */
export function LowStockTable({ data, threshold }: LowStockTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardDescription>Stock bajo</CardDescription>
        <CardTitle className="text-base">
          Productos activos con stock ≤ {threshold}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Producto</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead className="text-right">Stock</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={COLUMN_COUNT} className="h-32">
                    <div className="flex flex-col items-center gap-2 text-center text-muted-foreground">
                      <PackageCheck className="size-6" aria-hidden />
                      <p className="font-medium">
                        Ningún producto activo está por debajo del umbral.
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                data.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell className="font-medium">
                      {product.name}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {product.sku}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {product.stock}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
