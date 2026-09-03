import {
  createColumnHelper,
  rowPaginationFeature,
  rowSortingFeature,
  tableFeatures,
} from "@tanstack/react-table";
import { ImageOff } from "lucide-react";
import Image from "next/image";

import type { Category } from "../types/category";

import { CategoryRowActions } from "./category-row-actions";
import { CategoryStatusBadge } from "./category-status-badge";

export const categoriesTableFeatures = tableFeatures({
  rowSortingFeature,
  rowPaginationFeature,
});

const dateFormatter = new Intl.DateTimeFormat("es", { dateStyle: "medium" });

const helper = createColumnHelper<typeof categoriesTableFeatures, Category>();

export const categoriesColumns = helper.columns([
  helper.accessor("name", {
    header: "Categoría",
    cell: (info) => {
      const { imageUrl, name, description } = info.row.original;

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
            {description ? (
              <p className="text-muted-foreground line-clamp-1 text-xs">
                {description}
              </p>
            ) : null}
          </div>
        </div>
      );
    },
  }),
  helper.accessor("slug", {
    header: "Slug",
    enableSorting: false,
    cell: (info) => (
      <code className="text-muted-foreground text-xs">{info.getValue()}</code>
    ),
  }),
  helper.accessor("isActive", {
    header: "Estado",
    enableSorting: false,
    cell: (info) => <CategoryStatusBadge isActive={info.getValue()} />,
  }),
  helper.accessor("createdAt", {
    header: "Creada",
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
        <CategoryRowActions category={info.row.original} />
      </div>
    ),
  }),
]);
