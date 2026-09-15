"use client";

import { CreditCard, Plus } from "lucide-react";

import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { FOCUS_RING, MONO } from "@/modules/storefront/lib/styles";

import { brandLabel, formatExpiry, maskedNumber } from "../lib/card-display";

import type { PaymentMethod } from "../types/payment-method";

// Valor del radio de "otra tarjeta". Los `<input type="radio">` solo manejan
// strings, así que el `null` que ve quien consume necesita un centinela.
const OTHER = "other";

type PaymentMethodPickerProps = {
  methods: PaymentMethod[];
  /** `null` es "pagar con otra tarjeta", el camino hosteado de siempre. */
  value: string | null;
  onChange: (id: string | null) => void;
  disabled?: boolean;
};

const OPTION =
  "flex cursor-pointer items-center gap-3 rounded-[18px] bg-sunk px-3.5 py-3 text-[13.5px] font-normal transition-[background-color] duration-200 has-[:checked]:bg-[color-mix(in_oklch,var(--sunk),var(--ink)_8%)]";

/**
 * Elige con qué tarjeta pagar. No decide nada: emite el id elegido —o `null`
 * para "otra tarjeta"— y quien lo monta resuelve qué mutación disparar.
 *
 * Radios nativos y no un `RadioGroup` de shadcn: son cuatro opciones dentro de
 * un carrito, el navegador ya les da la semántica y el manejo de teclado, y
 * agregar un componente para esto solo engorda el bundle.
 */
export function PaymentMethodPicker({
  methods,
  value,
  onChange,
  disabled = false,
}: PaymentMethodPickerProps) {
  return (
    <fieldset disabled={disabled} className="flex flex-col gap-1.5">
      <legend className="text-ink-muted mb-1.5 text-[12.5px]">
        Pagar con
      </legend>

      {methods.map((method) => (
        <Label key={method.id} htmlFor={`pm-${method.id}`} className={OPTION}>
          <input
            type="radio"
            id={`pm-${method.id}`}
            name="payment-method"
            value={method.id}
            checked={value === method.id}
            onChange={() => onChange(method.id)}
            className={cn("accent-brand size-4 shrink-0", FOCUS_RING)}
          />
          <CreditCard aria-hidden className="text-ink-muted size-4 shrink-0" />
          <span className="min-w-0 flex-1 truncate">
            {brandLabel(method.brand)}{" "}
            <span className={cn(MONO, "text-ink-muted tracking-[0.1em]")}>
              {maskedNumber(method.last4)}
            </span>
          </span>
          <span className={cn(MONO, "text-ink-muted shrink-0 text-[12px]")}>
            {formatExpiry(method.expMonth, method.expYear)}
          </span>
        </Label>
      ))}

      <Label htmlFor={`pm-${OTHER}`} className={OPTION}>
        <input
          type="radio"
          id={`pm-${OTHER}`}
          name="payment-method"
          value={OTHER}
          checked={value === null}
          onChange={() => onChange(null)}
          className={cn("accent-brand size-4 shrink-0", FOCUS_RING)}
        />
        <Plus aria-hidden className="text-ink-muted size-4 shrink-0" />
        <span className="flex-1">Pagar con otra tarjeta</span>
      </Label>
    </fieldset>
  );
}
