"use client";

import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { ORDER_STATUS_OPTIONS, type OrderStatusFilter } from "../constants";

type AdminOrdersToolbarProps = {
  status: OrderStatusFilter;
  onStatusChange: (value: OrderStatusFilter) => void;
  dateFrom: string;
  onDateFromChange: (value: string) => void;
  dateTo: string;
  onDateToChange: (value: string) => void;
  customerSearch: string;
  onCustomerSearchChange: (value: string) => void;
};

/**
 * Filtros del listado. Componente controlado: emite el valor crudo y no toca la
 * query. Quién debounce la búsqueda y cuándo se rehace la consulta lo decide la
 * vista que lo monta.
 */
export function AdminOrdersToolbar({
  status,
  onStatusChange,
  dateFrom,
  onDateFromChange,
  dateTo,
  onDateToChange,
  customerSearch,
  onCustomerSearchChange,
}: AdminOrdersToolbarProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
      <div className="flex min-w-0 flex-1 flex-col gap-1.5 sm:max-w-sm">
        <Label htmlFor="admin-orders-search">Cliente</Label>
        <div className="relative">
          <Search
            className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2"
            aria-hidden
          />
          <Input
            id="admin-orders-search"
            type="search"
            value={customerSearch}
            onChange={(event) => onCustomerSearchChange(event.target.value)}
            placeholder="Buscar por nombre o correo"
            className="pl-8"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="admin-orders-status">Estado</Label>
        <Select
          value={status}
          onValueChange={(value) => onStatusChange(value as OrderStatusFilter)}
        >
          <SelectTrigger id="admin-orders-status" className="sm:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ORDER_STATUS_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* `max`/`min` cruzados: el mismo rango válido que exige el `refine` de
          `adminOrderQuerySchema`, avisado antes de mandar la consulta. */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="admin-orders-date-from">Desde</Label>
        <Input
          id="admin-orders-date-from"
          type="date"
          value={dateFrom}
          max={dateTo || undefined}
          onChange={(event) => onDateFromChange(event.target.value)}
          className="sm:w-44"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="admin-orders-date-to">Hasta</Label>
        <Input
          id="admin-orders-date-to"
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
