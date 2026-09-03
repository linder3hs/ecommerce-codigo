import type { CategoryQueryInput } from "./schemas/category.schema";

export const DEFAULT_PAGE_SIZE = 10;

export const SEARCH_DEBOUNCE_MS = 400;

export const PAGE_SIZE_OPTIONS = [10, 20, 50] as const;

export const CATEGORY_STATUS_OPTIONS = [
  { value: "all", label: "Todas" },
  { value: "true", label: "Activas" },
  { value: "false", label: "Inactivas" },
] as const;

export type CategoryStatusFilter =
  (typeof CATEGORY_STATUS_OPTIONS)[number]["value"];

export const categoryKeys = {
  all: ["categories"] as const,
  lists: () => [...categoryKeys.all, "list"] as const,
  list: (params: CategoryQueryInput) =>
    [...categoryKeys.lists(), params] as const,
  details: () => [...categoryKeys.all, "detail"] as const,
  detail: (id: string) => [...categoryKeys.details(), id] as const,
};
