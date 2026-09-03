"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { categoryKeys } from "../constants";
import type { CategoryQueryInput } from "../schemas/category.schema";
import { categoryService } from "../services/category.service";

export function useCategories(params: CategoryQueryInput) {
  return useQuery({
    queryKey: categoryKeys.list(params),
    queryFn: () => categoryService.list(params),
    placeholderData: keepPreviousData,
  });
}
