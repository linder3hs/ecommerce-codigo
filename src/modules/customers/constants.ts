import type { UserQueryInput } from "./schemas/user.schema";

export const DEFAULT_PAGE_SIZE = 10;

export const SEARCH_DEBOUNCE_MS = 400;

export const PAGE_SIZE_OPTIONS = [10, 20, 50] as const;

// Valor centinela de los selects: `Select` de Radix no admite `value=""`, así
// que "sin filtro" necesita un literal propio.
export const ALL_FILTER_VALUE = "all";

export const USER_STATUS_OPTIONS = [
  { value: ALL_FILTER_VALUE, label: "Todos" },
  { value: "true", label: "Activos" },
  { value: "false", label: "Inactivos" },
] as const;

export type UserStatusFilter = (typeof USER_STATUS_OPTIONS)[number]["value"];

export const customerKeys = {
  all: ["customers"] as const,
  lists: () => [...customerKeys.all, "list"] as const,
  list: (params: UserQueryInput) => [...customerKeys.lists(), params] as const,
  details: () => [...customerKeys.all, "detail"] as const,
  detail: (id: string) => [...customerKeys.details(), id] as const,
};
