"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { expenseKeys } from "../constants";
import { expenseService } from "../services/expense.service";

import type {
  CreateExpenseInput,
  UpdateExpenseInput,
} from "../schemas/expense.schema";

// Los mensajes de error los traduce el diálogo que dispara la mutación, no
// estos hooks.

export function useCreateExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateExpenseInput) => expenseService.create(input),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: expenseKeys.lists() }),
  });
}

// `onSettled` y no `onSuccess` en editar y eliminar: el 404 significa que otra
// persona ya borró la fila y lo que hay en pantalla quedó viejo, así que el
// error es justo el caso en el que más urge refrescar.

export function useUpdateExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateExpenseInput }) =>
      expenseService.update(id, input),
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: expenseKeys.lists() }),
  });
}

export function useDeleteExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => expenseService.remove(id),
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: expenseKeys.lists() }),
  });
}
