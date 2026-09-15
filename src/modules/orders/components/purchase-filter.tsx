"use client";

import { useState } from "react";

import { cn } from "@/lib/utils";
import {
  CARD,
  CHIP,
  CHIP_ON,
  FOCUS_RING,
  PILL,
  PILL_QUIET,
} from "@/modules/storefront/lib/styles";

import { isRangeValid, MAX_RANGE_DAYS } from "../lib/date-range";

import type { DateRange } from "../types/order-history";

type PurchaseFilterProps = {
  /** Rango aplicado hoy. */
  range: DateRange;
  /** Rango del mes en curso, resuelto una vez por quien monta el historial. */
  monthRange: DateRange;
  onChange: (range: DateRange) => void;
};

const FIELD = `bg-sunk text-ink h-11 rounded-full px-4 text-[13.5px] ${FOCUS_RING}`;

/**
 * Filtro de fechas del historial. No consulta nada: emite el rango y quien lo
 * monta decide qué hacer con él.
 *
 * El chip activo se deriva del rango aplicado en vez de guardarse aparte: así
 * ampliar el rango desde otro lugar de la vista —el CTA del vacío, por
 * ejemplo— mueve el chip solo, sin dos estados que puedan contradecirse.
 */
export function PurchaseFilter({
  range,
  monthRange,
  onChange,
}: PurchaseFilterProps) {
  const isMonth = range.from === monthRange.from && range.to === monthRange.to;

  const [showRange, setShowRange] = useState(!isMonth);
  const [draft, setDraft] = useState(range);
  const [appliedRange, setAppliedRange] = useState(range);

  // Ajuste durante el render, no en un efecto: cuando el rango aplicado cambia
  // desde fuera, los campos tienen que reflejarlo en la misma pasada.
  if (appliedRange !== range) {
    setAppliedRange(range);
    setDraft(range);

    if (!isMonth) {
      setShowRange(true);
    }
  }

  const canApply =
    isRangeValid(draft.from, draft.to) &&
    (draft.from !== range.from || draft.to !== range.to);

  return (
    <section className={cn(CARD, "flex flex-col gap-3.5 p-3.5 lg:p-4")}>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => {
            setShowRange(false);
            onChange(monthRange);
          }}
          aria-pressed={isMonth}
          className={cn(CHIP, isMonth && CHIP_ON)}
        >
          Mes actual
        </button>
        <button
          type="button"
          onClick={() => setShowRange(true)}
          aria-pressed={showRange}
          className={cn(CHIP, showRange && !isMonth && CHIP_ON)}
        >
          Rango
        </button>
      </div>

      {showRange ? (
        <div className="flex flex-wrap items-end gap-2.5">
          <label className="flex flex-col gap-1.5">
            <span className="text-ink-muted px-1 text-[12.5px]">Desde</span>
            <input
              type="date"
              value={draft.from}
              // Nadie compró en el futuro: el tope alto de los dos campos es
              // hoy, que es justo el cierre del rango del mes en curso.
              max={monthRange.to}
              onChange={(event) =>
                setDraft((current) => ({ ...current, from: event.target.value }))
              }
              className={FIELD}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-ink-muted px-1 text-[12.5px]">Hasta</span>
            <input
              type="date"
              value={draft.to}
              min={draft.from}
              max={monthRange.to}
              onChange={(event) =>
                setDraft((current) => ({ ...current, to: event.target.value }))
              }
              className={FIELD}
            />
          </label>
          <button
            type="button"
            disabled={!canApply}
            onClick={() => onChange(draft)}
            className={cn(PILL, PILL_QUIET, "h-11 px-5 text-[14px]")}
          >
            Aplicar
          </button>
        </div>
      ) : null}

      {showRange && !isRangeValid(draft.from, draft.to) ? (
        <p role="status" className="text-ink-muted px-1 text-[12.5px]">
          Elegí una fecha inicial anterior a la final, con un máximo de{" "}
          {MAX_RANGE_DAYS} días.
        </p>
      ) : null}
    </section>
  );
}
