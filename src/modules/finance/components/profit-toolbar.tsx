"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { isRangeValid, MAX_RANGE_DAYS } from "@/modules/orders/lib/date-range";

import type { DateRange } from "@/modules/orders/types/order-history";

type ProfitToolbarProps = {
  /** Rango aplicado: el que está consultando la vista. */
  range: DateRange;
  onRangeChange: (range: DateRange) => void;
};

/**
 * Rango del P&L. Las fechas se editan en borrador y se aplican con el botón:
 * cambiar un extremo a mano pasa por rangos intermedios inválidos que no tienen
 * por qué disparar consultas.
 *
 * El botón usa la misma regla que el `refine` de la API (`isRangeValid`), así
 * que un rango que respondería 400 no llega a pedirse (AC8).
 */
export function ProfitToolbar({ range, onRangeChange }: ProfitToolbarProps) {
  const [draft, setDraft] = useState(range);

  const isDraftValid = isRangeValid(draft.from, draft.to);
  const canApply =
    isDraftValid && (draft.from !== range.from || draft.to !== range.to);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        {/* `max`/`min` cruzados: el mismo orden que exige el `refine` de
            `orderHistoryQuerySchema`, avisado antes de mandar la consulta. */}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="profit-date-from">Desde</Label>
          <Input
            id="profit-date-from"
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
          <Label htmlFor="profit-date-to">Hasta</Label>
          <Input
            id="profit-date-to"
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
