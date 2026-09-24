import {
  createColumnHelper,
  rowPaginationFeature,
  tableFeatures,
} from "@tanstack/react-table";
import { Pencil, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCents } from "@/lib/format";

import { EXPENSE_CATEGORY_LABELS } from "../constants";

import type { ExpenseRow } from "../types/expense";

// Sin `rowSortingFeature`: el orden lo fija el servidor (fecha descendente) y
// no hay orden configurable que exponer.
export const expensesTableFeatures = tableFeatures({ rowPaginationFeature });

const dateFormatter = new Intl.DateTimeFormat("es", { dateStyle: "medium" });

/**
 * "YYYY-MM-DD" → fecha legible. Se arma con el constructor local y no con
 * `new Date(value)`: ese parsea el string como medianoche UTC y, en una zona
 * al oeste de Greenwich, lo mostraría como el día anterior.
 */
function formatExpenseDate(value: string): string {
  const [year, month, day] = value.split("-").map(Number);

  if (!year || !month || !day) {
    return value;
  }

  return dateFormatter.format(new Date(year, month - 1, day));
}

const helper = createColumnHelper<typeof expensesTableFeatures, ExpenseRow>();

type ExpenseColumnsOptions = {
  canUpdate: boolean;
  canDelete: boolean;
  onEdit: (expense: ExpenseRow) => void;
  onDelete: (expense: ExpenseRow) => void;
};

/**
 * Columnas del listado de egresos. Se construyen por vista porque dependen de
 * los permisos y de los callbacks que abren los diálogos. Sin `canUpdate` ni
 * `canDelete` la columna de acciones no existe (AC7): no es un botón
 * deshabilitado, es un control que no se dibuja.
 */
export function createExpensesColumns({
  canUpdate,
  canDelete,
  onEdit,
  onDelete,
}: ExpenseColumnsOptions) {
  return helper.columns([
    helper.accessor("expenseDate", {
      header: "Fecha",
      cell: (info) => (
        <time dateTime={info.getValue()} className="text-sm whitespace-nowrap">
          {formatExpenseDate(info.getValue())}
        </time>
      ),
    }),
    helper.accessor("category", {
      header: "Categoría",
      cell: (info) => (
        <Badge variant="outline">
          {EXPENSE_CATEGORY_LABELS[info.getValue()]}
        </Badge>
      ),
    }),
    helper.accessor("amountCents", {
      header: "Monto",
      cell: (info) => (
        <span className="font-medium tabular-nums">
          {formatCents(info.getValue())}
        </span>
      ),
    }),
    helper.accessor("description", {
      header: "Descripción",
      cell: (info) => {
        const description = info.getValue();

        return description === null ? (
          <span className="text-muted-foreground">
            —<span className="sr-only">Sin descripción</span>
          </span>
        ) : (
          <p className="max-w-xs truncate text-sm" title={description}>
            {description}
          </p>
        );
      },
    }),
    helper.accessor("createdByName", {
      header: "Registrado por",
      cell: (info) => (
        <span className="text-sm text-muted-foreground">
          {info.getValue() ?? "Sin nombre"}
        </span>
      ),
    }),
    ...(canUpdate || canDelete
      ? [
          helper.display({
            id: "actions",
            header: "",
            cell: (info) => {
              const expense = info.row.original;
              const label = `${EXPENSE_CATEGORY_LABELS[expense.category]} del ${formatExpenseDate(expense.expenseDate)}`;

              return (
                <div className="flex justify-end gap-1">
                  {canUpdate ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onEdit(expense)}
                      aria-label={`Editar el egreso ${label}`}
                    >
                      <Pencil className="size-4" aria-hidden />
                    </Button>
                  ) : null}
                  {canDelete ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onDelete(expense)}
                      aria-label={`Eliminar el egreso ${label}`}
                    >
                      <Trash2 className="size-4 text-destructive" aria-hidden />
                    </Button>
                  ) : null}
                </div>
              );
            },
          }),
        ]
      : []),
  ]);
}
