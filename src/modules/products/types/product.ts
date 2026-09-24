import type { InferSelectModel } from "drizzle-orm";

// `import type` es obligatorio: se borra en compilación y evita que drizzle-orm
// llegue al bundle del navegador.
import type { products } from "@/server/db/schema/product";
import type { PageMeta } from "@/types/api";

type ProductRow = InferSelectModel<typeof products>;

// El conjunto de campos se deriva del schema Drizzle, pero al viajar por HTTP
// los timestamptz llegan al cliente como strings ISO, no como Date.
//
// `costCents` es opcional porque la API lo omite —no lo pone en `null`— cuando
// el actor no tiene `product_cost.view`: `null` significa "costo desconocido" y
// afirmarlo sería mentir sobre un dato que sí existe. El opcional obliga a que
// quien lo consuma distinga los dos casos.
export type Product = Omit<
  ProductRow,
  "createdAt" | "updatedAt" | "deletedAt" | "costCents"
> & {
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  costCents?: number | null;
};

// La categoría llega resuelta desde el join del repositorio: el listado nunca
// consulta la categoría fila por fila.
export type ProductCategoryRef = {
  id: string;
  name: string;
  slug: string;
};

export type ProductListItem = Product & {
  category: ProductCategoryRef;
};

export type ProductListResponse = {
  data: ProductListItem[];
  meta: PageMeta;
};
