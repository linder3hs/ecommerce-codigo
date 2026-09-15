"use client";

import { ArrowDownUp } from "lucide-react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

import { CATALOG_SORTS, type CatalogSortId } from "../lib/catalog";
import { CARD, FOCUS_RING } from "../lib/styles";

type CatalogToolbarProps = {
  /** Productos visibles en la página actual. */
  shown: number;
  total: number;
  sort: CatalogSortId;
  onSortChange: (sort: CatalogSortId) => void;
};

/** Cabecera de resultados: título, cuántos se ven de cuántos y el orden. */
export function CatalogToolbar({
  shown,
  total,
  sort,
  onSortChange,
}: CatalogToolbarProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 px-1 pb-5">
      <div>
        <h1 className="text-[24px] font-semibold tracking-[-0.035em] lg:text-[30px]">
          Catálogo
        </h1>
        <p className="text-ink-muted mt-1 text-[13.5px]">
          {shown} de {total} productos
        </p>
      </div>

      <Select
        value={sort}
        // El valor llega como string: se resuelve contra la lista en vez de
        // afirmarlo con un cast.
        onValueChange={(value) => {
          const option = CATALOG_SORTS.find((item) => item.id === value);

          if (option !== undefined) {
            onSortChange(option.id);
          }
        }}
      >
        <SelectTrigger
          aria-label="Ordenar catálogo"
          className={cn(
            CARD,
            FOCUS_RING,
            "text-ink h-12 gap-2 rounded-full border-0 px-[18px] text-[13.5px] focus-visible:ring-0",
          )}
        >
          <ArrowDownUp aria-hidden className="text-ink-muted size-4" />
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="storefront">
          {CATALOG_SORTS.map((option) => (
            <SelectItem key={option.id} value={option.id}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
