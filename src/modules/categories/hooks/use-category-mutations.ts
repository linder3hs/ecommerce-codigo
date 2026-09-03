"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { categoryKeys } from "../constants";
import type {
  CreateCategoryInput,
  UpdateCategoryInput,
} from "../schemas/category.schema";
import { categoryService } from "../services/category.service";

export function useCreateCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateCategoryInput) => categoryService.create(input),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: categoryKeys.lists() }),
  });
}

export function useUpdateCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateCategoryInput }) =>
      categoryService.update(id, input),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: categoryKeys.lists() }),
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => categoryService.remove(id),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: categoryKeys.lists() }),
  });
}
