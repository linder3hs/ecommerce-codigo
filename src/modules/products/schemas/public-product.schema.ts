import { z } from "zod";

// Schema propio y no un flag sobre `productQuerySchema`: la API pública no
// admite `isActive` ni `categoryId`, y su tope de página es más bajo porque
// alimenta una grilla, no una tabla de administración.
// `discount` no es una columna: lo resuelve una expresión en el repositorio.
// Vive igual acá porque para la API pública es un criterio de orden más.
export const PUBLIC_PRODUCT_SORT_FIELDS = [
  "name",
  "priceCents",
  "createdAt",
  "discount",
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
  // Los dos extremos del rango viajan en centavos enteros, la misma unidad de
  // `price_cents`: convertir a decimales acá reintroduciría un float.
  minPriceCents: z.coerce
    .number("El precio mínimo debe ser un número.")
    .int("El precio mínimo debe ser un número entero.")
    .min(0, "El precio mínimo no puede ser negativo.")
    .optional(),
  maxPriceCents: z.coerce
    .number("El precio máximo debe ser un número.")
    .int("El precio máximo debe ser un número entero.")
    .min(0, "El precio máximo no puede ser negativo.")
    .optional(),
  onlyOffers: z
    .enum(["true", "false"], "El filtro de ofertas debe ser 'true' o 'false'.")
    .transform((value) => value === "true")
    .optional(),
  inStock: z
    .enum(["true", "false"], "El filtro de stock debe ser 'true' o 'false'.")
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

// Slug de la ficha pública. Mismo patrón kebab-case que `categorySlug`: valida
// la forma antes de llegar al repositorio, así una ruta con basura responde 400
// en vez de gastar una consulta a Neon.
export const publicProductSlugSchema = z
  .string("El slug debe ser texto.")
  .trim()
  .max(180, "El slug admite máximo 180 caracteres.")
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    "El slug solo admite minúsculas, números y guiones.",
  );
