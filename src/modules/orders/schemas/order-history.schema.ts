import { z } from "zod";

import { MAX_RANGE_DAYS, rangeDays } from "../lib/date-range";

const DATE_MESSAGE = "La fecha debe tener el formato AAAA-MM-DD.";

/**
 * Filtro de fechas del historial. Ambos extremos ausentes significan "mes
 * actual" y lo resuelve el handler: completar el rango acá metería el reloj
 * dentro del schema y lo volvería no determinista.
 *
 * Un solo extremo es un error y no un rango a medio adivinar: `?from=` sin `to`
 * podría querer decir "desde esa fecha hasta hoy" o "ese día", y elegir por el
 * usuario devuelve datos que no pidió.
 */
export const orderHistoryQuerySchema = z
  .object({
    from: z.iso.date(DATE_MESSAGE).optional(),
    to: z.iso.date(DATE_MESSAGE).optional(),
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

export type OrderHistoryQueryInput = z.infer<typeof orderHistoryQuerySchema>;

// Id de la orden tal como llega en la ruta de la boleta: validar la forma antes
// del repositorio evita gastar una consulta con basura de la URL.
export const orderIdSchema = z.uuid("La compra indicada no es válida.");
