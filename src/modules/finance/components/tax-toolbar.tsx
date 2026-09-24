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

import { TAX_PERIODS } from "../constants";

import type { TaxPeriod } from "../types/tax";
import type { DateRange } from "@/modules/orders/types/order-history";

type TaxToolbarProps = {
  /** Rango aplicado: el que está consultando la vista. */
  range: DateRange;
  onRangeChange: (range: DateRange) => void;
  period: TaxPeriod;
  onPeriodChange: (period: TaxPeriod) => void;
};

function isTaxPeriod(value: string): value is TaxPeriod {
  return TAX_PERIODS.some((option) => option.value === value);
}

/**
 * Filtros del reporte. Las fechas se editan en borrador y se aplican con el
 * botón: cambiar un extremo a mano pasa por rangos intermedios inválidos que no
 * tienen por qué disparar consultas. La periodicidad, en cambio, aplica al
 * elegirla.
 *
 * El botón usa la misma regla que el `refine` de la API (`isRangeValid`), así
 * que un rango que respondería 400 no llega a pedirse.
 */
export function TaxToolbar({
  range,
  onRangeChange,
  period,
  onPeriodChange,
}: TaxToolbarProps) {
  const [draft, setDraft] = useState(range);

  const isDraftValid = isRangeValid(draft.from, draft.to);
  const canApply =
    isDraftValid && (draft.from !== range.from || draft.to !== range.to);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        {/* `max`/`min` cruzados: el mismo orden que exige el `refine` de
            `taxQuerySchema`, avisado antes de mandar la consulta. */}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="tax-date-from">Desde</Label>
          <Input
            id="tax-date-from"
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
          <Label htmlFor="tax-date-to">Hasta</Label>
          <Input
            id="tax-date-to"
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
          <Label htmlFor="tax-period">Periodicidad</Label>
          <Select
            value={period}
            onValueChange={(value) => {
              if (isTaxPeriod(value)) {
                onPeriodChange(value);
              }
            }}
          >
            <SelectTrigger id="tax-period" className="sm:w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TAX_PERIODS.map((option) => (
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
