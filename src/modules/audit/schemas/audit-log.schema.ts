import { z } from "zod";

/**
 * Query del listado de auditoría. `dateFrom`/`dateTo` se coercionan a `Date`:
 * el cliente envía instantes ISO (el borde del día en su zona horaria) y el
 * repositorio compara contra `created_at`, que es timestamptz.
 */
export const auditLogQuerySchema = z
  .object({
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
      .default(20),
    entityType: z
      .string("El tipo de entidad debe ser texto.")
      .trim()
      .max(64, "El tipo de entidad admite máximo 64 caracteres.")
      .optional(),
    action: z
      .string("La acción debe ser texto.")
      .trim()
      .max(64, "La acción admite máximo 64 caracteres.")
      .optional(),
    actorId: z.uuid("El usuario seleccionado no es válido.").optional(),
    dateFrom: z.coerce.date("La fecha de inicio no es válida.").optional(),
    dateTo: z.coerce.date("La fecha de fin no es válida.").optional(),
  })
  .refine(
    (value) =>
      !value.dateFrom || !value.dateTo || value.dateFrom <= value.dateTo,
    {
      path: ["dateTo"],
      message: "La fecha de fin no puede ser anterior a la de inicio.",
    },
  );

export type AuditLogQueryInput = z.infer<typeof auditLogQuerySchema>;
