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

import { useAdjustStock } from "../hooks/use-adjust-stock";
import {
  adjustStockFormSchema,
  type AdjustStockFormInput,
  type AdjustStockFormOutput,
} from "../schemas/product.schema";

import type { ProductListItem } from "../types/product";

type AdjustStockDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: ProductListItem;
};

/**
 * Vista previa del resultado mientras se escribe. No valida —de eso se encarga
 * `adjustStockFormSchema` al enviar— solo decide si ya hay un número que
 * mostrar, así que no repite el regex del schema.
 */
function parseDelta(raw: string): number | null {
  const text = raw.trim();

  if (text === "") {
    return null;
  }

  const value = Number(text);

  return Number.isInteger(value) ? value : null;
}

export function AdjustStockDialog({
  open,
  onOpenChange,
  product,
}: AdjustStockDialogProps) {
  const adjustStock = useAdjustStock();

  const form = useForm<AdjustStockFormInput, unknown, AdjustStockFormOutput>({
    resolver: zodResolver(adjustStockFormSchema),
    defaultValues: { delta: "" },
  });

  const { errors } = form.formState;

  // `useWatch` y no `form.watch()`: el segundo devuelve una función que el
  // compilador de React no puede memoizar y le hace saltarse el componente.
  const rawDelta = useWatch({ control: form.control, name: "delta" });
  const delta = parseDelta(rawDelta ?? "");
  const resultingStock = delta === null ? null : product.stock + delta;
  const wouldGoNegative = resultingStock !== null && resultingStock < 0;

  function handleSubmit(values: AdjustStockFormOutput) {
    adjustStock.mutate(
      { id: product.id, input: values },
      {
        onSuccess: (updated) => {
          toast.success(`${product.name}: stock en ${updated.stock}.`);
          onOpenChange(false);
        },
        // El diálogo queda abierto a propósito: el 400 por stock insuficiente
        // trae el stock real en el mensaje y lo que toca es corregir el delta,
        // no volver a abrir el diálogo desde cero.
        onError: (error: Error) => toast.error(error.message),
      },
    );
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        // Cerrar a mitad de la mutación dejaría al admin sin el resultado.
        if (!next && adjustStock.isPending) {
          return;
        }

        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Ajustar stock</DialogTitle>
          <DialogDescription>
            {product.name} · {product.sku}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(handleSubmit)} noValidate>
          <FieldGroup>
            <Field data-invalid={Boolean(errors.delta)}>
              <FieldLabel htmlFor="adjust-stock-delta">Ajuste</FieldLabel>
              {/* Texto y no `type="number"`: el teclado numérico móvil esconde
                  el signo, y el schema espera la cadena con signo. */}
              <Input
                id="adjust-stock-delta"
                type="text"
                autoComplete="off"
                placeholder="+50 o -3"
                aria-invalid={Boolean(errors.delta)}
                {...form.register("delta")}
              />
              <FieldDescription>
                Se suma al stock actual. Usa un número negativo para descontar.
              </FieldDescription>
              <FieldError errors={[errors.delta]} />
            </Field>

            <dl className="bg-muted/50 grid grid-cols-2 gap-2 rounded-md p-3 text-sm">
              <dt className="text-muted-foreground">Stock actual</dt>
              <dd className="text-right font-medium tabular-nums">
                {product.stock}
              </dd>
              <dt className="text-muted-foreground">Quedará en</dt>
              <dd
                className={
                  wouldGoNegative
                    ? "text-destructive text-right font-medium tabular-nums"
                    : "text-right font-medium tabular-nums"
                }
              >
                {resultingStock ?? "—"}
              </dd>
            </dl>

            {wouldGoNegative ? (
              <p role="alert" className="text-destructive text-sm">
                El stock no puede quedar negativo: como máximo puedes descontar{" "}
                {product.stock}.
              </p>
            ) : null}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={adjustStock.isPending}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={adjustStock.isPending}>
                {adjustStock.isPending ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : null}
                Aplicar ajuste
              </Button>
            </DialogFooter>
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  );
}
