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

import {
  CATEGORY_STATUS_OPTIONS,
  type CategoryStatusFilter,
} from "../constants";

type CategoriesToolbarProps = {
  search: string;
  onSearchChange: (value: string) => void;
  status: CategoryStatusFilter;
  onStatusChange: (value: CategoryStatusFilter) => void;
  onCreate: () => void;
};

export function CategoriesToolbar({
  search,
  onSearchChange,
  status,
  onStatusChange,
  onCreate,
}: CategoriesToolbarProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-1 flex-col gap-3 sm:max-w-md sm:flex-row">
        <div className="relative flex-1">
          <Search
            className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2"
            aria-hidden
          />
          <Input
            type="search"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Buscar por nombre o slug"
            aria-label="Buscar categorías"
            className="pl-8"
          />
        </div>
        <Select
          value={status}
          onValueChange={(value) => onStatusChange(value as CategoryStatusFilter)}
        >
          <SelectTrigger className="sm:w-40" aria-label="Filtrar por estado">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CATEGORY_STATUS_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Button onClick={onCreate}>
        <Plus className="size-4" aria-hidden />
        Nueva categoría
      </Button>
    </div>
  );
}
