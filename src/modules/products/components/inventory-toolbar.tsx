"use client";

import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { LOW_STOCK_THRESHOLD } from "@/modules/dashboard/constants";

type InventoryToolbarProps = {
  search: string;
  onSearchChange: (value: string) => void;
  lowStockOnly: boolean;
  onLowStockOnlyChange: (value: boolean) => void;
};

/**
 * Filtros del inventario. Componente controlado: emite el texto crudo y no toca
 * la query. Quién debounce la búsqueda y cuándo se rehace la consulta lo decide
 * la vista que lo monta.
 */
export function InventoryToolbar({
  search,
  onSearchChange,
  lowStockOnly,
  onLowStockOnlyChange,
}: InventoryToolbarProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
      <div className="flex min-w-0 flex-1 flex-col gap-1.5 sm:max-w-sm">
        <Label htmlFor="inventory-search">Producto</Label>
        <div className="relative">
          <Search
            className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2"
            aria-hidden
          />
          <Input
            id="inventory-search"
            type="search"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Buscar por nombre o SKU"
            className="pl-8"
          />
        </div>
      </div>

      <div className="flex items-center gap-2 sm:h-9">
        <Switch
          id="inventory-low-stock-only"
          checked={lowStockOnly}
          onCheckedChange={onLowStockOnlyChange}
        />
        <Label htmlFor="inventory-low-stock-only">
          Solo stock bajo ({LOW_STOCK_THRESHOLD} o menos)
        </Label>
      </div>
    </div>
  );
}
