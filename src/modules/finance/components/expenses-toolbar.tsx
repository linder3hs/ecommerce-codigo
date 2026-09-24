"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ALL_FILTER_VALUE } from "@/modules/audit/constants";

import { EXPENSE_CATEGORY_OPTIONS } from "../constants";

type ExpensesToolbarProps = {
  category: string;
  onCategoryChange: (value: string) => void;
  dateFrom: string;
  onDateFromChange: (value: string) => void;
  dateTo: string;
  onDateToChange: (value: string) => void;
};

/**
 * Filtros del listado de egresos. Componente controlado: emite los valores
 * crudos y la vista decide cuándo se rehace la consulta. El `min`/`max`
 * cruzado impide elegir un rango invertido; el 400 del servidor queda como
 * red para quien escriba la URL a mano.
 */
export function ExpensesToolbar({
  category,
  onCategoryChange,
  dateFrom,
  onDateFromChange,
  dateTo,
  onDateToChange,
}: ExpensesToolbarProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="expenses-category">Categoría</Label>
        <Select value={category} onValueChange={onCategoryChange}>
          <SelectTrigger id="expenses-category" className="sm:w-52">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_FILTER_VALUE}>
              Todas las categorías
            </SelectItem>
            {EXPENSE_CATEGORY_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="expenses-date-from">Desde</Label>
        <Input
          id="expenses-date-from"
          type="date"
          value={dateFrom}
          max={dateTo || undefined}
          onChange={(event) => onDateFromChange(event.target.value)}
          className="sm:w-44"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="expenses-date-to">Hasta</Label>
        <Input
          id="expenses-date-to"
          type="date"
          value={dateTo}
          min={dateFrom || undefined}
          onChange={(event) => onDateToChange(event.target.value)}
          className="sm:w-44"
        />
      </div>
    </div>
  );
}
