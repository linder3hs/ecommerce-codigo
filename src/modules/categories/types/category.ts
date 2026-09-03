import type { InferSelectModel } from "drizzle-orm";

// `import type` es obligatorio: se borra en compilación y evita que drizzle-orm
// llegue al bundle del navegador.
import type { categories } from "@/server/db/schema/category";

type CategoryRow = InferSelectModel<typeof categories>;

// El conjunto de campos se deriva del schema Drizzle, pero al viajar por HTTP
// los timestamptz llegan al cliente como strings ISO, no como Date.
export type Category = Omit<
  CategoryRow,
  "createdAt" | "updatedAt" | "deletedAt"
> & {
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

export type PageMeta = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type CategoryListResponse = {
  data: Category[];
  meta: PageMeta;
};
