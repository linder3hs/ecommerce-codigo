"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { Controller, useForm, type DefaultValues } from "react-hook-form";

import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

import { EXPENSE_CATEGORY_OPTIONS } from "../constants";
import {
  expenseFormSchema,
  type ExpenseFormInput,
  type ExpenseFormOutput,
} from "../schemas/expense.schema";

// `setValueAs` también corre sobre el valor por defecto, que puede ser `null`.
// El vacío vale `null` y no "": es lo que el API lee como "sin descripción".
function toNullable(value: unknown): string | null {
  return (typeof value === "string" ? value.trim() : "") || null;
}

type ExpenseFormProps = {
  // Parciales: al crear no hay categoría elegida y el `Select` muestra su
  // placeholder en vez de proponer una que el admin no escogió.
  defaultValues: DefaultValues<ExpenseFormInput>;
  submitLabel: string;
  isPending: boolean;
  serverError: string | null;
  onSubmit: (values: ExpenseFormOutput) => void;
  onCancel: () => void;
};

export function ExpenseForm({
  defaultValues,
  submitLabel,
  isPending,
  serverError,
  onSubmit,
  onCancel,
}: ExpenseFormProps) {
  const form = useForm<ExpenseFormInput, unknown, ExpenseFormOutput>({
    resolver: zodResolver(expenseFormSchema),
    defaultValues,
  });

  const { errors } = form.formState;

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
      <FieldGroup>
        {serverError ? (
          <p
            role="alert"
            className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            {serverError}
          </p>
        ) : null}

        <Field data-invalid={Boolean(errors.category)}>
          <FieldLabel htmlFor="expense-category">Categoría</FieldLabel>
          <Controller
            control={form.control}
            name="category"
            render={({ field }) => (
              <Select
                value={field.value || undefined}
                onValueChange={field.onChange}
              >
                <SelectTrigger
                  id="expense-category"
                  className="w-full"
                  aria-invalid={Boolean(errors.category)}
                  onBlur={field.onBlur}
                  ref={field.ref}
                >
                  <SelectValue placeholder="Selecciona una categoría" />
                </SelectTrigger>
                <SelectContent>
                  {EXPENSE_CATEGORY_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          <FieldDescription>
            Las compras de inventario no se registran aquí: el costo de
            mercadería sale de la ficha del producto.
          </FieldDescription>
          <FieldError errors={[errors.category]} />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field data-invalid={Boolean(errors.amount)}>
            <FieldLabel htmlFor="expense-amount">Monto (S/)</FieldLabel>
            <Input
              id="expense-amount"
              inputMode="decimal"
              autoComplete="off"
              placeholder="250.00"
              aria-invalid={Boolean(errors.amount)}
              {...form.register("amount")}
            />
            <FieldError errors={[errors.amount]} />
          </Field>

          <Field data-invalid={Boolean(errors.expenseDate)}>
            <FieldLabel htmlFor="expense-date">Fecha</FieldLabel>
            <Input
              id="expense-date"
              type="date"
              aria-invalid={Boolean(errors.expenseDate)}
              {...form.register("expenseDate")}
            />
            <FieldError errors={[errors.expenseDate]} />
          </Field>
        </div>

        <Field data-invalid={Boolean(errors.description)}>
          <FieldLabel htmlFor="expense-description">Descripción</FieldLabel>
          <Textarea
            id="expense-description"
            rows={3}
            maxLength={280}
            placeholder="Opcional"
            aria-invalid={Boolean(errors.description)}
            {...form.register("description", { setValueAs: toNullable })}
          />
          <FieldError errors={[errors.description]} />
        </Field>

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isPending}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : null}
            {submitLabel}
          </Button>
        </div>
      </FieldGroup>
    </form>
  );
}
