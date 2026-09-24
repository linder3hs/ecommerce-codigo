import type { InferSelectModel } from "drizzle-orm";

// `import type` es obligatorio: se borra en compilación y evita que drizzle-orm
// llegue al bundle del navegador.
import type { expenseCategory, expenses } from "@/server/db/schema/expense";
import type { PageMeta } from "@/types/api";

type ExpenseDbRow = InferSelectModel<typeof expenses>;

export type ExpenseCategory = (typeof expenseCategory.enumValues)[number];

/**
 * Egreso tal como viaja por el cable. Sin `createdBy` crudo ni `deletedAt`: el
 * panel muestra el nombre del autor, no su id, y una fila borrada nunca llega.
 * `expenseDate` ya es "YYYY-MM-DD" (`mode: "string"`); `createdAt` llega como
 * string ISO porque el JSON no transporta `Date`.
 */
export type ExpenseRow = Pick<
  ExpenseDbRow,
  "id" | "category" | "amountCents" | "expenseDate" | "description"
> & {
  createdByName: string | null;
  createdAt: string;
};

export type ExpenseListResponse = {
  data: ExpenseRow[];
  meta: PageMeta;
};
