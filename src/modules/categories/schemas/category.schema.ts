import { z } from "zod";

export const categoryQuerySchema = z.object({
  page: z.coerce
    .number("La página debe ser un número.")
    .int("La página debe ser un número entero.")
    .min(1, "La página mínima es 1.")
    .default(1),
  pageSize: z.coerce
    .number("El tamaño de página debe ser un número.")
    .int("El tamaño de página debe ser un número entero.")
    .min(1, "El tamaño de página mínimo es 1.")
    .max(100, "El tamaño de página máximo es 100.")
    .default(10),
  search: z
    .string("La búsqueda debe ser texto.")
    .trim()
    .max(100, "La búsqueda admite máximo 100 caracteres.")
    .optional(),
  isActive: z
    .enum(["true", "false"], "El estado debe ser 'true' o 'false'.")
    .transform((value) => value === "true")
    .optional(),
  sortBy: z
    .enum(
      ["name", "createdAt", "updatedAt"],
      "No se puede ordenar por ese campo.",
    )
    .default("createdAt"),
  sortDir: z
    .enum(["asc", "desc"], "La dirección de orden debe ser 'asc' o 'desc'.")
    .default("desc"),
});

export const createCategorySchema = z.object({
  name: z
    .string("El nombre es obligatorio.")
    .trim()
    .min(2, "El nombre debe tener al menos 2 caracteres.")
    .max(120, "El nombre admite máximo 120 caracteres."),
  slug: z
    .string("El slug debe ser texto.")
    .trim()
    .min(2, "El slug debe tener al menos 2 caracteres.")
    .max(140, "El slug admite máximo 140 caracteres.")
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "El slug solo admite minúsculas, números y guiones.",
    )
    .optional(),
  description: z
    .string("La descripción debe ser texto.")
    .trim()
    .max(1000, "La descripción admite máximo 1000 caracteres.")
    .nullish(),
  imageUrl: z
    .url("La URL de imagen no es válida.")
    .max(2048, "La URL admite máximo 2048 caracteres.")
    .nullish(),
  isActive: z.boolean("El estado debe ser verdadero o falso.").default(true),
});

// `.partial()` no elimina el `.default(true)` de `isActive`: sin el `.omit()`
// previo, un PATCH parcial reactivaría en silencio una categoría desactivada.
export const updateCategorySchema = createCategorySchema
  .omit({ isActive: true })
  .partial()
  .extend({
    isActive: z.boolean("El estado debe ser verdadero o falso.").optional(),
  });

export const categoryIdSchema = z.uuid("El identificador no es válido.");

export type CategoryQueryInput = z.infer<typeof categoryQuerySchema>;
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
