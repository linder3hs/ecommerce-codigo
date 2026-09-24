import { z } from "zod";

import { MAX_RANGE_DAYS, rangeDays } from "@/modules/orders/lib/date-range";

const DATE_MESSAGE = "La fecha debe tener el formato AAAA-MM-DD.";

/** Periodicidad del reporte. Única definición de la lista: el tipo y las opciones se derivan de acá. */
export const taxPeriodSchema = z.enum(["month", "quarter"], {
  error: "La periodicidad debe ser 'month' o 'quarter'.",
});

/**
 * Consulta del reporte de IGV. Los tres `refine` del rango son copia de
 * `orderHistoryQuerySchema` y `revenueQuerySchema` y no una derivación:
 * `.extend()`/`.omit()` sobre un objeto refinado lanza en Zod 4.
 *
 * Sin extremos significa "mes en curso" y lo resuelve el handler: completar el
 * rango acá metería el reloj dentro del schema.
 */
export const taxQuerySchema = z
  .object({
    from: z.iso.date(DATE_MESSAGE).optional(),
    to: z.iso.date(DATE_MESSAGE).optional(),
    period: taxPeriodSchema.default("month"),
  })
  .refine(
    ({ from, to }) => (from === undefined) === (to === undefined),
    "El rango necesita las dos fechas: 'from' y 'to'.",
  )
  .refine(
    ({ from, to }) => from === undefined || to === undefined || from <= to,
    "La fecha inicial no puede ser posterior a la final.",
  )
  .refine(
    ({ from, to }) =>
      from === undefined ||
      to === undefined ||
      rangeDays(from, to) <= MAX_RANGE_DAYS,
    `El rango admite máximo ${MAX_RANGE_DAYS} días.`,
  );

export type TaxQueryInput = z.infer<typeof taxQuerySchema>;
