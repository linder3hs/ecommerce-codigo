import type { ProductQueryInput } from "@/modules/products/schemas/product.schema";

import type { UnitPriceQueryInput } from "./schemas/unit-price.schema";
import type { RevenueQueryInput } from "./schemas/revenue.schema";
import type { RevenueBreakdown } from "./types/revenue";
import type { ExpenseQueryInput } from "./schemas/expense.schema";
import type { ExpenseCategory } from "./types/expense";
import type { TaxQueryInput } from "./schemas/tax-report.schema";
import type { TaxPeriod } from "./types/tax";
import type { DateRange } from "@/modules/orders/types/order-history";

/**
 * Orden fijo del listado de precio unitario: alfabético por nombre. No es
 * configurable a propósito —el margen es un valor derivado y no una columna, así
 * que Postgres no puede ordenar por él— y por eso no viaja en la query: lo aplica
 * el handler al llamar a `productRepository.list`.
 */
export const UNIT_PRICE_DEFAULT_QUERY: Pick<
  ProductQueryInput,
  "sortBy" | "sortDir"
> = {
  sortBy: "name",
  sortDir: "asc",
};

export const unitPriceKeys = {
  all: ["unit-prices"] as const,
  lists: () => [...unitPriceKeys.all, "list"] as const,
  list: (params: UnitPriceQueryInput) =>
    [...unitPriceKeys.lists(), params] as const,
};

// Orden de presentación de las categorías de egreso. Se repite como literal y no
// se lee de `expenseCategory.enumValues` porque eso metería drizzle-orm en el
// bundle del cliente; `satisfies` impide que aquí entre un valor que el pgEnum
// no tenga, y el `Record` de etiquetas obliga a nombrar todos los que tiene.
export const EXPENSE_CATEGORY_VALUES = [
  "shipping",
  "marketing",
  "payroll",
  "payment_fees",
  "other",
] as const satisfies readonly ExpenseCategory[];

export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  shipping: "Envíos",
  marketing: "Marketing",
  payroll: "Planilla",
  payment_fees: "Comisiones de pago",
  other: "Otros",
};

export const EXPENSE_CATEGORY_OPTIONS = EXPENSE_CATEGORY_VALUES.map(
  (value) => ({ value, label: EXPENSE_CATEGORY_LABELS[value] }),
);

export const expenseKeys = {
  all: ["expenses"] as const,
  lists: () => [...expenseKeys.all, "list"] as const,
  list: (params: ExpenseQueryInput) =>
    [...expenseKeys.lists(), params] as const,
};

/** Filas del top del desglose de ingresos; el resto se resume en "Otros". */
export const BREAKDOWN_LIMIT = 20;

export const REVENUE_BREAKDOWNS = [
  { value: "product", label: "Producto" },
  { value: "category", label: "Categoría" },
] as const satisfies readonly { value: RevenueBreakdown; label: string }[];

export const revenueKeys = {
  all: ["revenue"] as const,
  reports: () => [...revenueKeys.all, "report"] as const,
  report: (params: RevenueQueryInput) =>
    [...revenueKeys.reports(), params] as const,
};

export const TAX_PERIODS = [
  { value: "month", label: "Mensual" },
  { value: "quarter", label: "Trimestral" },
] as const satisfies readonly { value: TaxPeriod; label: string }[];

export const taxKeys = {
  all: ["tax"] as const,
  reports: () => [...taxKeys.all, "report"] as const,
  report: (params: TaxQueryInput) => [...taxKeys.reports(), params] as const,
};

export const profitKeys = {
  all: ["profit"] as const,
  reports: () => [...profitKeys.all, "report"] as const,
  report: (range: DateRange) => [...profitKeys.reports(), range] as const,
};
