"use client";

import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type UnitPriceToolbarProps = {
  search: string;
  onSearchChange: (value: string) => void;
};

/**
 * Búsqueda del listado de precio unitario. Componente controlado: emite el texto
 * crudo y no toca la query. Quién debounce la búsqueda y cuándo se rehace la
 * consulta lo decide la vista que lo monta.
 */
export function UnitPriceToolbar({
  search,
  onSearchChange,
}: UnitPriceToolbarProps) {
  return (
    <div className="flex flex-col gap-1.5 sm:max-w-sm">
      <Label htmlFor="unit-price-search">Producto</Label>
      <div className="relative">
        <Search
          className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2"
          aria-hidden
        />
        <Input
          id="unit-price-search"
          type="search"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Buscar por nombre o SKU"
          className="pl-8"
        />
      </div>
    </div>
  );
}
