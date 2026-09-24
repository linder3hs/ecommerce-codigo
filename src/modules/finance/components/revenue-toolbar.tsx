"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { isRangeValid, MAX_RANGE_DAYS } from "@/modules/orders/lib/date-range";

import { REVENUE_BREAKDOWNS } from "../constants";

import type { RevenueBreakdown } from "../types/revenue";
import type { DateRange } from "@/modules/orders/types/order-history";

type RevenueToolbarProps = {
  /** Rango aplicado: el que está consultando la vista. */
  range: DateRange;
  onRangeChange: (range: DateRange) => void;
  breakdown: RevenueBreakdown;
  onBreakdownChange: (breakdown: RevenueBreakdown) => void;
};

function isBreakdown(value: string): value is RevenueBreakdown {
  return REVENUE_BREAKDOWNS.some((option) => option.value === value);
}

/**
 * Filtros del reporte. Las fechas se editan en borrador y se aplican con el
 * botón: cambiar un extremo a mano pasa por rangos intermedios inválidos que no
 * tienen por qué disparar consultas. El desglose, en cambio, aplica al elegirlo.
 *
 * El botón usa la misma regla que el `refine` de la API (`isRangeValid`), así
 * que un rango que respondería 400 no llega a pedirse.
 */
export function RevenueToolbar({
  range,
  onRangeChange,
  breakdown,
  onBreakdownChange,
}: RevenueToolbarProps) {
  const [draft, setDraft] = useState(range);

  const isDraftValid = isRangeValid(draft.from, draft.to);
  const canApply =
    isDraftValid && (draft.from !== range.from || draft.to !== range.to);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        {/* `max`/`min` cruzados: el mismo orden que exige el `refine` de
            `revenueQuerySchema`, avisado antes de mandar la consulta. */}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="revenue-date-from">Desde</Label>
          <Input
            id="revenue-date-from"
            type="date"
            value={draft.from}
            max={draft.to || undefined}
            onChange={(event) =>
              setDraft((current) => ({ ...current, from: event.target.value }))
            }
            className="sm:w-44"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="revenue-date-to">Hasta</Label>
          <Input
            id="revenue-date-to"
            type="date"
            value={draft.to}
            min={draft.from || undefined}
            onChange={(event) =>
              setDraft((current) => ({ ...current, to: event.target.value }))
            }
            className="sm:w-44"
          />
        </div>

        <Button
          type="button"
          variant="outline"
          disabled={!canApply}
          onClick={() => onRangeChange(draft)}
        >
          Aplicar
        </Button>

        <div className="flex flex-col gap-1.5 sm:ml-auto">
          <Label htmlFor="revenue-breakdown">Desglose por</Label>
          <Select
            value={breakdown}
            onValueChange={(value) => {
              if (isBreakdown(value)) {
                onBreakdownChange(value);
              }
            }}
          >
            <SelectTrigger id="revenue-breakdown" className="sm:w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {REVENUE_BREAKDOWNS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {!isDraftValid ? (
        <p role="status" className="text-sm text-muted-foreground">
          Elige una fecha inicial anterior o igual a la final, con un máximo de{" "}
          {MAX_RANGE_DAYS} días.
        </p>
      ) : null}
    </div>
  );
}
