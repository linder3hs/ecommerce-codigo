import { z } from "zod";

// Schema propio y no un flag sobre `productQuerySchema`: la API pública no
// admite `isActive` ni `categoryId`, y su tope de página es más bajo porque
// alimenta una grilla, no una tabla de administración.
export const PUBLIC_PRODUCT_SORT_FIELDS = [
  "name",
  "priceCents",
  "createdAt",
] as const;

export const PUBLIC_PRODUCT_PAGE_SIZE = 12;

export const publicProductQuerySchema = z.object({
  page: z.coerce
    .number("La página debe ser un número.")
    .int("La página debe ser un número entero.")
    .min(1, "La página mínima es 1.")
    .default(1),
  pageSize: z.coerce
    .number("El tamaño de página debe ser un número.")
    .int("El tamaño de página debe ser un número entero.")
    .min(1, "El tamaño de página mínimo es 1.")
    .max(48, "El tamaño de página máximo es 48.")
    .default(PUBLIC_PRODUCT_PAGE_SIZE),
  search: z
    .string("La búsqueda debe ser texto.")
    .trim()
    .max(100, "La búsqueda admite máximo 100 caracteres.")
    .optional(),
  // Se filtra por slug y no por id: el storefront navega por URLs legibles y
  // nunca ve los uuid del catálogo.
  categorySlug: z
    .string("La categoría debe ser texto.")
    .trim()
    .max(140, "La categoría admite máximo 140 caracteres.")
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "La categoría solo admite minúsculas, números y guiones.",
    )
    .optional(),
  onlyOffers: z
    .enum(["true", "false"], "El filtro de ofertas debe ser 'true' o 'false'.")
    .transform((value) => value === "true")
    .optional(),
  sortBy: z
    .enum(PUBLIC_PRODUCT_SORT_FIELDS, "No se puede ordenar por ese campo.")
    .default("createdAt"),
  sortDir: z
    .enum(["asc", "desc"], "La dirección de orden debe ser 'asc' o 'desc'.")
    .default("desc"),
});

export type PublicProductQueryInput = z.infer<typeof publicProductQuerySchema>;
