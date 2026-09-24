import {
  createColumnHelper,
  rowPaginationFeature,
  tableFeatures,
} from "@tanstack/react-table";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LOW_STOCK_THRESHOLD } from "@/modules/dashboard/constants";

import type { ProductListItem } from "../types/product";

// Sin `rowSortingFeature`: el inventario se lee siempre por menor stock primero
// (`INVENTORY_DEFAULT_QUERY`). No hay orden configurable que exponer.
export const inventoryTableFeatures = tableFeatures({ rowPaginationFeature });

const helper = createColumnHelper<
  typeof inventoryTableFeatures,
  ProductListItem
>();

/**
 * Columnas del inventario. Se construyen por vista porque dependen del permiso
 * y del callback que abre el diálogo: la columna solo dispara el evento, quién
 * monta el diálogo de ajuste es de la vista.
 *
 * Con `canAdjust` en false la columna de acciones no existe (AC6): no es un
 * botón deshabilitado, es una columna que no se dibuja.
 */
export function createInventoryColumns(
  canAdjust: boolean,
  onAdjust: (product: ProductListItem) => void,
) {
  return helper.columns([
    helper.accessor("name", {
      header: "Producto",
      cell: (info) => (
        <p className="min-w-0 truncate font-medium">{info.getValue()}</p>
      ),
    }),
    helper.accessor("sku", {
      header: "SKU",
      cell: (info) => (
        <code className="text-muted-foreground text-xs">{info.getValue()}</code>
      ),
    }),
    helper.accessor((row) => row.category.name, {
      id: "category",
      header: "Categoría",
      cell: (info) => <span className="text-sm">{info.getValue()}</span>,
    }),
    helper.accessor("stock", {
      header: "Stock",
      cell: (info) => {
        const stock = info.getValue();
        const isLow = stock <= LOW_STOCK_THRESHOLD;

        return (
          <Badge
            variant={isLow ? "destructive" : "outline"}
            className="tabular-nums"
          >
            {stock}
          </Badge>
        );
      },
    }),
    ...(canAdjust
      ? [
          helper.display({
            id: "actions",
            header: "",
            cell: (info) => {
              const product = info.row.original;

              return (
                <div className="flex justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onAdjust(product)}
                    aria-label={`Ajustar el stock de ${product.name}`}
                  >
                    Ajustar
                  </Button>
                </div>
              );
            },
          }),
        ]
      : []),
  ]);
}
