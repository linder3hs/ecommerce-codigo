"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { expenseKeys } from "../constants";
import { expenseService } from "../services/expense.service";

import type { ExpenseQueryInput } from "../schemas/expense.schema";

/**
 * Listado paginado de egresos. `keepPreviousData` mantiene la página anterior
 * en pantalla mientras llega la nueva: sin él, cada cambio de filtro o de
 * página vaciaría la tabla y devolvería el skeleton.
 */
export function useExpenses(params: ExpenseQueryInput) {
  return useQuery({
    queryKey: expenseKeys.list(params),
    queryFn: () => expenseService.list(params),
    placeholderData: keepPreviousData,
  });
}
