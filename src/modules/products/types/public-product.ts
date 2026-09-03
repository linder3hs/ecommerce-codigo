import type { InferSelectModel } from "drizzle-orm";

// `import type` es obligatorio: se borra en compilación y evita que drizzle-orm
// llegue al bundle del navegador.
import type { PublicCategoryRef } from "@/modules/categories/types/public-category";
import type { products } from "@/server/db/schema/product";
import type { PageMeta } from "@/types/api";

type ProductRow = InferSelectModel<typeof products>;

/**
 * Espejo en el cliente de la proyección de `productRepository.listPublic`. No
 * hay timestamps que convertir a string porque la API pública no los devuelve:
 * `sku`, `isActive`, `deletedAt`, `createdAt`, `updatedAt` y `categoryId` se
 * quedan del lado del servidor.
 */
export type PublicProduct = Pick<
  ProductRow,
  | "id"
  | "name"
  | "slug"
  | "description"
  | "priceCents"
  | "compareAtPriceCents"
  | "stock"
  | "imageUrl"
> & {
  category: PublicCategoryRef;
};

export type PublicProductListResponse = {
  data: PublicProduct[];
  meta: PageMeta;
};
