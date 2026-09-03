"use client";

import { Plus, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCategories } from "@/modules/categories/hooks/use-categories";

import {
  ALL_CATEGORIES,
  CATEGORY_OPTIONS_QUERY,
  PRODUCT_STATUS_OPTIONS,
  type ProductStatusFilter,
} from "../constants";

type ProductsToolbarProps = {
  search: string;
  onSearchChange: (value: string) => void;
  status: ProductStatusFilter;
  onStatusChange: (value: ProductStatusFilter) => void;
  categoryId: string;
  onCategoryChange: (value: string) => void;
  onCreate: () => void;
};

export function ProductsToolbar({
  search,
  onSearchChange,
  status,
  onStatusChange,
  categoryId,
  onCategoryChange,
  onCreate,
}: ProductsToolbarProps) {
  const categories = useCategories(CATEGORY_OPTIONS_QUERY);

  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-1 flex-col gap-3 sm:flex-row lg:max-w-3xl">
        <div className="relative flex-1">
          <Search
            className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2"
            aria-hidden
          />
          <Input
            type="search"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Buscar por nombre, SKU o slug"
            aria-label="Buscar productos"
            className="pl-8"
          />
        </div>

        <Select
          value={status}
          onValueChange={(value) => onStatusChange(value as ProductStatusFilter)}
        >
          <SelectTrigger className="sm:w-44" aria-label="Filtrar por estado">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PRODUCT_STATUS_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={categoryId} onValueChange={onCategoryChange}>
          <SelectTrigger className="sm:w-52" aria-label="Filtrar por categoría">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_CATEGORIES}>Todas las categorías</SelectItem>
            {categories.data?.data.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Button onClick={onCreate}>
        <Plus className="size-4" aria-hidden />
        Nuevo producto
      </Button>
    </div>
  );
}
