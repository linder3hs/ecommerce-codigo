"use client";

import { Plus } from "lucide-react";
import { useCallback, useState } from "react";

import { Button } from "@/components/ui/button";
import { ALL_FILTER_VALUE } from "@/modules/audit/constants";
import { DEFAULT_PAGE_SIZE } from "@/modules/products/constants";

import { EXPENSE_CATEGORY_VALUES } from "../constants";
import { useExpenses } from "../hooks/use-expenses";

import { DeleteExpenseDialog } from "./delete-expense-dialog";
import { ExpenseFormDialog } from "./expense-form-dialog";
import { ExpensesTable } from "./expenses-table";
import { ExpensesToolbar } from "./expenses-toolbar";

import type { ExpenseQueryInput } from "../schemas/expense.schema";
import type { ExpenseRow } from "../types/expense";
import type { PaginationState } from "@tanstack/react-table";

const FIRST_PAGE: PaginationState = {
  pageIndex: 0,
  pageSize: DEFAULT_PAGE_SIZE,
};

// Día local "YYYY-MM-DD": el mismo formato que da `<input type="date">`.
// `toISOString()` daría el día UTC, que de noche en Lima ya es mañana.
function todayLocalDate(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${now.getFullYear()}-${month}-${day}`;
}

type ExpensesViewProps = {
  // Los resuelve el Server Component con los permisos efectivos. Son solo
  // presentación: la barrera real es `requirePermission` en cada handler.
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
};

export function ExpensesView({
  canCreate,
  canUpdate,
  canDelete,
}: ExpensesViewProps) {
  const [category, setCategory] = useState<string>(ALL_FILTER_VALUE);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [pagination, setPagination] = useState<PaginationState>(FIRST_PAGE);
  // `null` = diálogo de alta cerrado; el string es la fecha con que arranca.
  const [createDate, setCreateDate] = useState<string | null>(null);
  const [editingExpense, setEditingExpense] = useState<ExpenseRow | null>(null);
  const [deletingExpense, setDeletingExpense] = useState<ExpenseRow | null>(
    null,
  );

  const params: ExpenseQueryInput = {
    page: pagination.pageIndex + 1,
    pageSize: pagination.pageSize,
    // `find` hace de guarda de tipo: el centinela "todas" no es una categoría y
    // cae en `undefined`, que es "sin filtro".
    category: EXPENSE_CATEGORY_VALUES.find((value) => value === category),
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
  };

  const expenses = useExpenses(params);

  const hasFilters =
    category !== ALL_FILTER_VALUE || dateFrom !== "" || dateTo !== "";

  // Cambiar un filtro invalida la página en la que estaba el admin: la página 3
  // del resultado anterior no tiene por qué existir en el nuevo (AC2).
  function resetToFirstPage() {
    setPagination((previous) => ({ ...previous, pageIndex: 0 }));
  }

  function handleCategoryChange(value: string) {
    setCategory(value);
    resetToFirstPage();
  }

  function handleDateFromChange(value: string) {
    setDateFrom(value);
    resetToFirstPage();
  }

  function handleDateToChange(value: string) {
    setDateTo(value);
    resetToFirstPage();
  }

  // Estables: las columnas de la tabla se memoizan sobre estos callbacks.
  const handleEdit = useCallback((expense: ExpenseRow) => {
    setEditingExpense(expense);
  }, []);

  const handleDelete = useCallback((expense: ExpenseRow) => {
    setDeletingExpense(expense);
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <ExpensesToolbar
          category={category}
          onCategoryChange={handleCategoryChange}
          dateFrom={dateFrom}
          onDateFromChange={handleDateFromChange}
          dateTo={dateTo}
          onDateToChange={handleDateToChange}
        />
        {canCreate ? (
          <Button onClick={() => setCreateDate(todayLocalDate())}>
            <Plus className="size-4" aria-hidden />
            Nuevo egreso
          </Button>
        ) : null}
      </div>

      <ExpensesTable
        data={expenses.data?.data}
        rowCount={expenses.data?.meta.total ?? 0}
        pagination={pagination}
        onPaginationChange={setPagination}
        canUpdate={canUpdate}
        canDelete={canDelete}
        onEdit={handleEdit}
        onDelete={handleDelete}
        hasFilters={hasFilters}
        isLoading={expenses.isPending}
        isError={expenses.isError}
        errorMessage={expenses.error?.message ?? null}
        onRetry={() => void expenses.refetch()}
      />

      {/* Montados solo cuando se abren: cada apertura arranca con los valores
          de esa fila (o con un alta en blanco), sin arrastrar el estado de la
          anterior. */}
      {canCreate && createDate !== null ? (
        <ExpenseFormDialog
          open
          onOpenChange={(next) => {
            if (!next) {
              setCreateDate(null);
            }
          }}
          defaultDate={createDate}
        />
      ) : null}

      {canUpdate && editingExpense ? (
        <ExpenseFormDialog
          key={editingExpense.id}
          open
          onOpenChange={(next) => {
            if (!next) {
              setEditingExpense(null);
            }
          }}
          expense={editingExpense}
        />
      ) : null}

      {canDelete && deletingExpense ? (
        <DeleteExpenseDialog
          key={deletingExpense.id}
          open
          onOpenChange={(next) => {
            if (!next) {
              setDeletingExpense(null);
            }
          }}
          expense={deletingExpense}
        />
      ) : null}
    </div>
  );
}
