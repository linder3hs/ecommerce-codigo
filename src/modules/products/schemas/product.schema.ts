import { z } from "zod";

import { AMOUNT_INPUT_PATTERN, toCents } from "@/lib/format";
import { IMAGE_URL_HOST_MESSAGE, isAllowedImageUrl } from "@/lib/image-hosts";

// 999.999.999 centavos = S/ 9.999.999,99, el tope que cabe en el `integer` de
// Postgres (2.147.483.647) de `price_cents`. Rechazarlo aquí devuelve 400 con
// `issues` en vez del 500 opaco que daría el desbordamiento en el insert.
const MAX_CENTS = 999_999_999;

export const PRODUCT_SORT_FIELDS = [
  "name",
  "priceCents",
  "stock",
  "createdAt",
  "updatedAt",
] as const;

export const productQuerySchema = z.object({
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
  categoryId: z.uuid("La categoría seleccionada no es válida.").optional(),
  sortBy: z
    .enum(PRODUCT_SORT_FIELDS, "No se puede ordenar por ese campo.")
    .default("createdAt"),
  sortDir: z
    .enum(["asc", "desc"], "La dirección de orden debe ser 'asc' o 'desc'.")
    .default("desc"),
});

const centsSchema = (label: string) =>
  z
    .number(`${label} debe ser un número.`)
    .int(`${label} no admite decimales: se expresa en centavos.`)
    .min(0, `${label} no puede ser negativo.`)
    .max(MAX_CENTS, `${label} supera el máximo permitido.`);

export const createProductSchema = z.object({
  name: z
    .string("El nombre es obligatorio.")
    .trim()
    .min(2, "El nombre debe tener al menos 2 caracteres.")
    .max(160, "El nombre admite máximo 160 caracteres."),
  slug: z
    .string("El slug debe ser texto.")
    .trim()
    .min(2, "El slug debe tener al menos 2 caracteres.")
    .max(180, "El slug admite máximo 180 caracteres.")
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "El slug solo admite minúsculas, números y guiones.",
    )
    .optional(),
  // El regex acepta ambas cajas y `toUpperCase()` normaliza después: así el
  // mensaje de error nunca depende de cómo lo haya tecleado el usuario.
  sku: z
    .string("El SKU es obligatorio.")
    .trim()
    .min(2, "El SKU debe tener al menos 2 caracteres.")
    .max(64, "El SKU admite máximo 64 caracteres.")
    .regex(
      /^[A-Za-z0-9][A-Za-z0-9._-]*$/,
      "El SKU solo admite letras, números, punto, guion y guion bajo.",
    )
    .toUpperCase(),
  description: z
    .string("La descripción debe ser texto.")
    .trim()
    .max(2000, "La descripción admite máximo 2000 caracteres.")
    .nullish(),
  priceCents: centsSchema("El precio"),
  compareAtPriceCents: centsSchema("El precio de comparación").nullish(),
  stock: z
    .number("El stock debe ser un número.")
    .int("El stock debe ser un número entero.")
    .min(0, "El stock no puede ser negativo.")
    .max(1_000_000, "El stock supera el máximo permitido.")
    .default(0),
  categoryId: z.uuid("Selecciona una categoría válida."),
  imageUrl: z
    .url("La URL de imagen no es válida.")
    .max(2048, "La URL admite máximo 2048 caracteres.")
    .refine(isAllowedImageUrl, IMAGE_URL_HOST_MESSAGE)
    .nullish(),
  isActive: z.boolean("El estado debe ser verdadero o falso.").default(true),
});

// `.partial()` no elimina el `.default(true)` de `isActive`: sin el `.omit()`
// previo, un PATCH parcial reactivaría en silencio un producto despublicado.
export const updateProductSchema = createProductSchema
  .omit({ isActive: true })
  .partial()
  .extend({
    isActive: z.boolean("El estado debe ser verdadero o falso.").optional(),
  });

export const productIdSchema = z.uuid("El identificador no es válido.");

// El formulario captura los precios en soles ("1299,90") y los convierte a
// centavos aquí mismo, para que la API siga recibiendo solo enteros.
const amountInputSchema = (label: string) =>
  z
    .string(`${label} es obligatorio.`)
    .trim()
    .regex(
      AMOUNT_INPUT_PATTERN,
      `${label} debe ser un monto como 1299 o 1299.90.`,
    )
    .transform((value, ctx) => {
      const cents = toCents(value);

      if (cents === null) {
        ctx.addIssue({ code: "custom", message: `${label} no es válido.` });

        return z.NEVER;
      }

      return cents;
    });

export const productFormSchema = createProductSchema
  .omit({ priceCents: true, compareAtPriceCents: true })
  .extend({
    price: amountInputSchema("El precio"),
    // El campo vacío llega como null desde el `setValueAs` del formulario, no
    // como "": así el opcional no compite con el regex del monto.
    compareAtPrice: amountInputSchema("El precio de comparación").nullable(),
  });

export type ProductQueryInput = z.infer<typeof productQuerySchema>;
export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type ProductFormInput = z.input<typeof productFormSchema>;
export type ProductFormOutput = z.output<typeof productFormSchema>;
