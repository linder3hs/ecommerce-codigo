"use client";

import { useQuery } from "@tanstack/react-query";

import { publicCategoryService } from "../services/public-category.service";

export const publicCategoryKeys = {
  all: ["public-categories"] as const,
  list: () => [...publicCategoryKeys.all, "list"] as const,
};

export function usePublicCategories() {
  return useQuery({
    queryKey: publicCategoryKeys.list(),
    queryFn: () => publicCategoryService.list(),
  });
}
