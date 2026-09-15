"use client";

import { Check, CreditCard, Loader2, Trash2 } from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { CHIP, MONO, TAG } from "@/modules/storefront/lib/styles";

import { useDeletePaymentMethod } from "../hooks/use-delete-payment-method";
import { useSetDefaultPaymentMethod } from "../hooks/use-set-default-payment-method";
import { brandLabel, formatExpiry, maskedNumber } from "../lib/card-display";

import type { PaymentMethod } from "../types/payment-method";

/**
 * Una tarjeta guardada. Cada tarjeta maneja sus propias mutaciones: el estado
 * de carga y el error pertenecen a la fila sobre la que se actuó, no a la
 * lista entera, y así borrar una no bloquea las demás.
 */
export function PaymentMethodCard({ method }: { method: PaymentMethod }) {
  const setDefault = useSetDefaultPaymentMethod();
  const remove = useDeletePaymentMethod();
  const busy = setDefault.isPending || remove.isPending;
  const error = setDefault.error ?? remove.error;

  return (
    <li className="bg-sunk flex flex-col gap-3 rounded-[20px] p-3.5 lg:flex-row lg:items-center lg:gap-4 lg:p-4">
      <span className="bg-surface text-ink inline-flex size-11 shrink-0 items-center justify-center rounded-2xl">
        <CreditCard aria-hidden className="size-[19px]" />
      </span>

      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-2 text-[14.5px] font-medium">
          {brandLabel(method.brand)}
          <span className={cn(MONO, "text-ink-muted tracking-[0.12em]")}>
            {maskedNumber(method.last4)}
          </span>
          {method.isDefault ? (
            <span className={TAG}>
              <Check aria-hidden className="size-3.5" />
              Predeterminada
            </span>
          ) : null}
        </p>
        <p className="text-ink-muted mt-1 text-[12.5px]">
          Vence {formatExpiry(method.expMonth, method.expYear)}
        </p>
        {error ? (
          <p role="alert" className="text-ink-muted mt-1.5 text-[12px]">
            {error.message}
          </p>
        ) : null}
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {method.isDefault ? null : (
          <button
            type="button"
            disabled={busy}
            onClick={() => setDefault.mutate(method.id)}
            className={cn(CHIP, "disabled:pointer-events-none disabled:opacity-40")}
          >
            {setDefault.isPending ? (
              <Loader2 aria-hidden className="size-3.5 animate-spin" />
            ) : null}
            Usar por defecto
          </button>
        )}

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button
              type="button"
              disabled={busy}
              aria-label={`Eliminar la tarjeta ${brandLabel(method.brand)} terminada en ${method.last4}`}
              className={cn(CHIP, "disabled:pointer-events-none disabled:opacity-40")}
            >
              {remove.isPending ? (
                <Loader2 aria-hidden className="size-3.5 animate-spin" />
              ) : (
                <Trash2 aria-hidden className="size-3.5" />
              )}
            </button>
          </AlertDialogTrigger>

          <AlertDialogContent className="storefront">
            <AlertDialogHeader>
              <AlertDialogTitle>¿Eliminar esta tarjeta?</AlertDialogTitle>
              <AlertDialogDescription>
                Se va a quitar {brandLabel(method.brand)}{" "}
                {maskedNumber(method.last4)} de tu cuenta. Para volver a usarla
                vas a tener que cargarla de nuevo.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={() => remove.mutate(method.id)}>
                Eliminar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </li>
  );
}
