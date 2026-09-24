"use client";

import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { formatCents } from "@/lib/format";

import { EXPENSE_CATEGORY_LABELS } from "../constants";
import { useDeleteExpense } from "../hooks/use-expense-mutations";

import type { ExpenseRow } from "../types/expense";

type DeleteExpenseDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expense: ExpenseRow;
};

export function DeleteExpenseDialog({
  open,
  onOpenChange,
  expense,
}: DeleteExpenseDialogProps) {
  const deleteExpense = useDeleteExpense();

  const summary = `${EXPENSE_CATEGORY_LABELS[expense.category]} por ${formatCents(expense.amountCents)}`;

  function handleConfirm() {
    deleteExpense.mutate(expense.id, {
      onSuccess: () => {
        toast.success(`Se eliminó el egreso de ${summary}.`);
        onOpenChange(false);
      },
      onError: (error: Error) => toast.error(error.message),
    });
  }

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (!next && deleteExpense.isPending) {
          return;
        }

        onOpenChange(next);
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Eliminar el egreso de {summary}?</AlertDialogTitle>
          <AlertDialogDescription>
            Dejará de aparecer en el listado y de restar en las ganancias del
            periodo. La eliminación queda registrada en auditoría y no se puede
            deshacer desde el panel.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleteExpense.isPending}>
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={deleteExpense.isPending}
            onClick={(event) => {
              event.preventDefault();
              handleConfirm();
            }}
          >
            {deleteExpense.isPending ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : null}
            Eliminar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
