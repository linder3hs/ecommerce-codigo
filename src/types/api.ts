// Metadatos de paginación compartidos por todos los listados de la API.
// `modules/categories/types/category.ts` mantiene su copia hasta el spec de
// limpieza (Deuda 3 del spec 002).
export type PageMeta = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};
