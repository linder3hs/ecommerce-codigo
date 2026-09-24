import {
  createColumnHelper,
  rowPaginationFeature,
  tableFeatures,
} from "@tanstack/react-table";

import { Button } from "@/components/ui/button";
import { formatCents } from "@/lib/format";

import { marginPct } from "../lib/margin";

import type { UnitPriceRow } from "../types/unit-price";

// Sin `rowSortingFeature`: el orden lo fija el servidor
// (`UNIT_PRICE_DEFAULT_QUERY`, alfabético) porque el margen es un valor derivado
// y Postgres no puede ordenar por él. No hay orden configurable que exponer.
export const unitPriceTableFeatures = tableFeatures({ rowPaginationFeature });

// Un decimal: el margen porcentual es una lectura de negocio, no un importe, y
// dos decimales sugerirían una precisión que el redondeo del costo no sostiene.
const pctFormatter = new Intl.NumberFormat("es-ES", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

const helper = createColumnHelper<
  typeof unitPriceTableFeatures,
  UnitPriceRow
>();

/**
 * Hueco de un dato que no existe (AC2). El guion es lo que se ve; el texto
 * `sr-only` es lo que se oye, porque un lector de pantalla no puede distinguir
 * "costo desconocido" de "margen sin calcular" leyendo el mismo guion en dos
 * columnas distintas.
 */
function UnknownValue({ label }: { label: string }) {
  return (
    <span className="text-muted-foreground tabular-nums">
      —<span className="sr-only">{label}</span>
    </span>
  );
}

/**
 * Columnas de precio unitario. Se construyen por vista porque dependen del
 * permiso y del callback que abre el diálogo: la columna solo dispara el evento
 * y quién monta el diálogo es de la vista.
 *
 * Con `canEditCost` en false la columna de acciones no existe (AC6): no es un
 * botón deshabilitado, es una columna que no se dibuja.
 */
export function createUnitPriceColumns(
  canEditCost: boolean,
  onEditCost: (product: UnitPriceRow) => void,
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
    helper.accessor("category", {
      header: "Categoría",
      cell: (info) => <span className="text-sm">{info.getValue()}</span>,
    }),
    helper.accessor("priceCents", {
      header: "Precio",
      cell: (info) => (
        <span className="font-medium tabular-nums">
          {formatCents(info.getValue())}
        </span>
      ),
    }),
    helper.accessor("costCents", {
      header: "Costo",
      cell: (info) => {
        const costCents = info.getValue();

        // `null` es costo desconocido, nunca 0: un "S/ 0,00" afirmaría que el
        // producto no cuesta nada.
        return costCents === null ? (
          <UnknownValue label="Costo desconocido" />
        ) : (
          <span className="tabular-nums">{formatCents(costCents)}</span>
        );
      },
    }),
    helper.accessor("marginCents", {
      header: "Margen",
      cell: (info) => {
        const margin = info.getValue();

        if (margin === null) {
          return <UnknownValue label="Sin margen: el costo es desconocido" />;
        }

        // El costo por encima del precio se guarda sin error (AC3) y es
        // justamente lo que hay que ver de un golpe en el listado.
        return (
          <span
            className={
              margin < 0
                ? "text-destructive font-medium tabular-nums"
                : "font-medium tabular-nums"
            }
          >
            {formatCents(margin)}
          </span>
        );
      },
    }),
    helper.display({
      id: "marginPct",
      header: "Margen %",
      cell: (info) => {
        const { priceCents, costCents } = info.row.original;
        const pct = marginPct(priceCents, costCents);

        if (pct === null) {
          return (
            <UnknownValue
              label={
                costCents === null
                  ? "Sin margen porcentual: el costo es desconocido"
                  : "Sin margen porcentual: el precio es 0"
              }
            />
          );
        }

        return (
          <span
            className={
              pct < 0 ? "text-destructive tabular-nums" : "tabular-nums"
            }
          >
            {pctFormatter.format(pct)} %
          </span>
        );
      },
    }),
    ...(canEditCost
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
                    onClick={() => onEditCost(product)}
                    aria-label={`Editar el costo de ${product.name}`}
                  >
                    Editar costo
                  </Button>
                </div>
              );
            },
          }),
        ]
      : []),
  ]);
}
