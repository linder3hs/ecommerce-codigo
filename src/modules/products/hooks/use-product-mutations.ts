"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { productKeys } from "../constants";
import type {
  CreateProductInput,
  UpdateProductInput,
} from "../schemas/product.schema";
import { productService } from "../services/product.service";

export function useCreateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateProductInput) => productService.create(input),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: productKeys.lists() }),
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateProductInput }) =>
      productService.update(id, input),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: productKeys.lists() }),
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => productService.remove(id),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: productKeys.lists() }),
  });
}
