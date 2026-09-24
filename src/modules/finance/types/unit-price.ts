import type { InferSelectModel } from "drizzle-orm";

// `import type` es obligatorio: se borra en compilación y evita que drizzle-orm
// llegue al bundle del navegador.
import type { products } from "@/server/db/schema/product";
import type { PageMeta } from "@/types/api";

type ProductRow = InferSelectModel<typeof products>;

/**
 * Fila de la tabla de precio unitario. Solo enteros por el cable: el margen
 * porcentual se deriva en el cliente con `marginPct`, para no mandar un float
 * que además tendría que redondearse dos veces.
 *
 * `category` es el nombre ya resuelto por el join del repositorio, no el objeto
 * completo: la columna solo muestra texto y ni el id ni el slug se usan aquí.
 *
 * `costCents` y `marginCents` son `number | null` y no opcionales: este endpoint
 * exige `product_cost.view`, así que quien recibe la fila siempre puede ver el
 * costo y el `null` significa una sola cosa, costo desconocido.
 */
export type UnitPriceRow = Pick<
  ProductRow,
  "id" | "name" | "sku" | "priceCents"
> & {
  category: string;
  costCents: number | null;
  marginCents: number | null;
};

export type UnitPriceListResponse = {
  data: UnitPriceRow[];
  meta: PageMeta;
};
