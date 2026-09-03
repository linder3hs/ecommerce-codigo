import type { InferSelectModel } from "drizzle-orm";

// `import type` es obligatorio: se borra en compilación y evita que drizzle-orm
// llegue al bundle del navegador.
import type { categories } from "@/server/db/schema/category";

type CategoryRow = InferSelectModel<typeof categories>;

// Espejo en el cliente de la proyección de `categoryRepository.listPublic`. Al
// derivarse del schema con `Pick`, agregar una columna interna no la arrastra
// hasta acá.
export type PublicCategory = Pick<
  CategoryRow,
  "id" | "name" | "slug" | "imageUrl"
>;

// La categoría embebida en un producto viaja sin foto: en la landing la imagen
// que se muestra es la del producto.
export type PublicCategoryRef = Pick<PublicCategory, "id" | "name" | "slug">;

// El listado público no pagina: son todas las categorías activas.
export type PublicCategoryListResponse = {
  data: PublicCategory[];
};
