"use client";

import { useState } from "react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { centsToAmountInput } from "@/lib/format";

import {
  useCreateExpense,
  useUpdateExpense,
} from "../hooks/use-expense-mutations";

import { ExpenseForm } from "./expense-form";

import type {
  CreateExpenseInput,
  ExpenseFormInput,
  ExpenseFormOutput,
} from "../schemas/expense.schema";
import type { ExpenseRow } from "../types/expense";
import type { DefaultValues } from "react-hook-form";

type ExpenseFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Sin egreso es un alta; con egreso, su edición.
  expense?: ExpenseRow;
  // Solo para el alta: día local "YYYY-MM-DD" con el que arranca la fecha. Lo
  // calcula quien abre el diálogo, en el evento, para que el render no
  // dependa del reloj.
  defaultDate?: string;
};

function toFormValues(
  expense: ExpenseRow | undefined,
  defaultDate: string | undefined,
): DefaultValues<ExpenseFormInput> {
  if (!expense) {
    return { amount: "", expenseDate: defaultDate ?? "", description: null };
  }

  return {
    category: expense.category,
    amount: centsToAmountInput(expense.amountCents),
    expenseDate: expense.expenseDate,
    description: expense.description,
  };
}

function toInput(values: ExpenseFormOutput): CreateExpenseInput {
  return {
    category: values.category,
    amountCents: values.amount,
    expenseDate: values.expenseDate,
    description: values.description,
  };
}

export function ExpenseFormDialog({
  open,
  onOpenChange,
  expense,
  defaultDate,
}: ExpenseFormDialogProps) {
  const [serverError, setServerError] = useState<string | null>(null);
  const createExpense = useCreateExpense();
  const updateExpense = useUpdateExpense();

  const isEdit = expense !== undefined;
  const isPending = createExpense.isPending || updateExpense.isPending;

  function close() {
    setServerError(null);
    onOpenChange(false);
  }

  function handleSubmit(values: ExpenseFormOutput) {
    setServerError(null);

    const handlers = {
      onSuccess: () => {
        toast.success(isEdit ? "Egreso actualizado." : "Egreso registrado.");
        close();
      },
      // El diálogo queda abierto: el error se corrige en el formulario, no
      // reabriéndolo.
      onError: (error: Error) => setServerError(error.message),
    };

    if (expense) {
      updateExpense.mutate(
        { id: expense.id, input: toInput(values) },
        handlers,
      );

      return;
    }

    createExpense.mutate(toInput(values), handlers);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        // Cerrar a mitad de la mutación dejaría al admin sin el resultado.
        if (!next && isPending) {
          return;
        }

        if (!next) {
          close();

          return;
        }

        onOpenChange(true);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar egreso" : "Nuevo egreso"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Corrige los datos del gasto. El cambio queda en auditoría."
              : "Registra un gasto operativo de la tienda."}
          </DialogDescription>
        </DialogHeader>
        <ExpenseForm
          key={expense?.id ?? "new"}
          defaultValues={toFormValues(expense, defaultDate)}
          submitLabel={isEdit ? "Guardar cambios" : "Registrar egreso"}
          isPending={isPending}
          serverError={serverError}
          onSubmit={handleSubmit}
          onCancel={close}
        />
      </DialogContent>
    </Dialog>
  );
}
