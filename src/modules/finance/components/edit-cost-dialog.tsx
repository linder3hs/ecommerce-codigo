"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { centsToAmountInput, formatCents, toCents } from "@/lib/format";

import { useUpdateCost } from "../hooks/use-update-cost";
import { marginCents } from "../lib/margin";
import {
  updateCostFormSchema,
  type UpdateCostFormInput,
  type UpdateCostFormOutput,
} from "../schemas/unit-price.schema";

import type { UnitPriceRow } from "../types/unit-price";

type EditCostDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: UnitPriceRow;
};

// El campo vacío vale `null` —costo desconocido— y no "": así el opcional no
// compite con el regex del monto, igual que el precio de comparación del
// formulario de producto.
function toNullableAmount(value: unknown): string | null {
  return (typeof value === "string" ? value.trim() : "") || null;
}

export function EditCostDialog({
  open,
  onOpenChange,
  product,
}: EditCostDialogProps) {
  const updateCost = useUpdateCost();

  const form = useForm<UpdateCostFormInput, unknown, UpdateCostFormOutput>({
    resolver: zodResolver(updateCostFormSchema),
    // Se precarga el costo vigente: la edición más común es corregirlo, no
    // escribirlo desde cero. `null` (desconocido) arranca en blanco.
    defaultValues: {
      cost:
        product.costCents === null
          ? null
          : centsToAmountInput(product.costCents),
    },
  });

  const { errors } = form.formState;

  // `useWatch` y no `form.watch()`: el segundo devuelve una función que el
  // compilador de React no puede memoizar y le hace saltarse el componente.
  const rawCost = useWatch({ control: form.control, name: "cost" });

  // Vaciar el campo no es un error: es la forma de volver a "costo
  // desconocido", y por eso se distingue del monto mal escrito, que solo se
  // señala al enviar.
  const isBlank = rawCost == null || rawCost.trim() === "";
  const previewCost = isBlank ? null : toCents(rawCost);
  const previewMargin =
    previewCost === null ? null : marginCents(product.priceCents, previewCost);
  const isNegativeMargin = previewMargin !== null && previewMargin < 0;

  function handleSubmit(values: UpdateCostFormOutput) {
    updateCost.mutate(
      { id: product.id, input: { costCents: values.cost } },
      {
        onSuccess: (updated) => {
          toast.success(
            updated.costCents === null
              ? `${product.name}: costo desconocido.`
              : `${product.name}: costo en ${formatCents(updated.costCents)}.`,
          );
          onOpenChange(false);
        },
        // El diálogo queda abierto a propósito: el 400 "el costo ya tenía ese
        // valor" se corrige cambiando el monto, no reabriendo el diálogo.
        onError: (error: Error) => toast.error(error.message),
      },
    );
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        // Cerrar a mitad de la mutación dejaría al admin sin el resultado.
        if (!next && updateCost.isPending) {
          return;
        }

        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar costo</DialogTitle>
          <DialogDescription>
            {product.name} · {product.sku}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(handleSubmit)} noValidate>
          <FieldGroup>
            <Field data-invalid={Boolean(errors.cost)}>
              <FieldLabel htmlFor="edit-cost-amount">Costo (S/)</FieldLabel>
              <Input
                id="edit-cost-amount"
                inputMode="decimal"
                autoComplete="off"
                placeholder="180.00"
                aria-invalid={Boolean(errors.cost)}
                {...form.register("cost", { setValueAs: toNullableAmount })}
              />
              <FieldDescription>
                Déjalo vacío para marcar el costo como desconocido. No es lo
                mismo que un costo de cero.
              </FieldDescription>
              <FieldError errors={[errors.cost]} />
            </Field>

            <dl className="bg-muted/50 grid grid-cols-2 gap-2 rounded-md p-3 text-sm">
              <dt className="text-muted-foreground">Precio de venta</dt>
              <dd className="text-right font-medium tabular-nums">
                {formatCents(product.priceCents)}
              </dd>
              <dt className="text-muted-foreground">Margen resultante</dt>
              <dd
                className={
                  isNegativeMargin
                    ? "text-destructive text-right font-medium tabular-nums"
                    : "text-right font-medium tabular-nums"
                }
              >
                {previewMargin === null ? "—" : formatCents(previewMargin)}
              </dd>
            </dl>

            {isBlank ? (
              <p className="text-muted-foreground text-sm">
                Al guardar, este producto queda sin costo conocido y su margen
                dejará de calcularse.
              </p>
            ) : null}

            {isNegativeMargin ? (
              <p role="alert" className="text-destructive text-sm">
                El costo supera el precio de venta: se guardará igual, pero el
                producto se vendería con pérdida.
              </p>
            ) : null}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={updateCost.isPending}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={updateCost.isPending}>
                {updateCost.isPending ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : null}
                Guardar costo
              </Button>
            </DialogFooter>
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  );
}
