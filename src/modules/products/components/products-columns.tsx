import {
  createColumnHelper,
  rowPaginationFeature,
  rowSortingFeature,
  tableFeatures,
} from "@tanstack/react-table";
import { ImageOff } from "lucide-react";
import Image from "next/image";

import { Badge } from "@/components/ui/badge";
import { formatCents } from "@/lib/format";

import type { ProductListItem } from "../types/product";

import { ProductRowActions } from "./product-row-actions";

export const productsTableFeatures = tableFeatures({
  rowSortingFeature,
  rowPaginationFeature,
});

const dateFormatter = new Intl.DateTimeFormat("es", { dateStyle: "medium" });

const helper = createColumnHelper<
  typeof productsTableFeatures,
  ProductListItem
>();

/**
 * Columnas del listado de productos. Es una factory y no una constante porque
 * `canEditCost` viaja hasta el formulario de edición que abre la fila: el campo
 * Costo solo se dibuja para quien puede verlo (AC6), y el permiso lo resuelve el
 * Server Component de la página.
 */
export function createProductsColumns(canEditCost: boolean) {
  return helper.columns([
    helper.accessor("name", {
      header: "Producto",
      cell: (info) => {
        const { imageUrl, name, sku } = info.row.original;

        return (
          <div className="flex items-center gap-3">
            <div className="bg-muted text-muted-foreground relative size-9 shrink-0 overflow-hidden rounded-md">
              {imageUrl ? (
                // `unoptimized`: las URLs las escribe el admin a mano y no hay
                // remotePatterns configurado en next.config.ts.
                <Image
                  src={imageUrl}
                  alt=""
                  fill
                  unoptimized
                  sizes="36px"
                  className="object-cover"
                />
              ) : (
                <ImageOff
                  className="absolute inset-0 m-auto size-4"
                  aria-hidden
                />
              )}
            </div>
            <div className="min-w-0">
              <p className="truncate font-medium">{name}</p>
              <code className="text-muted-foreground text-xs">{sku}</code>
            </div>
          </div>
        );
      },
    }),
    helper.accessor((row) => row.category.name, {
      id: "category",
      header: "Categoría",
      enableSorting: false,
      cell: (info) => <span className="text-sm">{info.getValue()}</span>,
    }),
    helper.accessor("priceCents", {
      header: "Precio",
      cell: (info) => {
        const { compareAtPriceCents } = info.row.original;

        return (
          <div className="flex flex-col">
            <span className="font-medium tabular-nums">
              {formatCents(info.getValue())}
            </span>
            {compareAtPriceCents !== null ? (
              <span className="text-muted-foreground text-xs line-through tabular-nums">
                {formatCents(compareAtPriceCents)}
              </span>
            ) : null}
          </div>
        );
      },
    }),
    helper.accessor("stock", {
      header: "Stock",
      cell: (info) => {
        const stock = info.getValue();

        return (
          <span
            className={
              stock === 0
                ? "text-destructive text-sm tabular-nums"
                : "text-sm tabular-nums"
            }
          >
            {stock}
          </span>
        );
      },
    }),
    helper.accessor("isActive", {
      header: "Estado",
      enableSorting: false,
      cell: (info) => (
        <Badge variant={info.getValue() ? "secondary" : "outline"}>
          {info.getValue() ? "Publicado" : "Despublicado"}
        </Badge>
      ),
    }),
    helper.accessor("createdAt", {
      header: "Creado",
      cell: (info) => (
        <span className="text-muted-foreground text-sm">
          {dateFormatter.format(new Date(info.getValue()))}
        </span>
      ),
    }),
    helper.display({
      id: "actions",
      header: "",
      cell: (info) => (
        <div className="flex justify-end">
          <ProductRowActions
            product={info.row.original}
            canEditCost={canEditCost}
          />
        </div>
      ),
    }),
  ]);
}
