import { z } from "zod";

import { ORDER_STATUSES } from "@/modules/dashboard/constants";

/**
 * Query del listado de órdenes del panel. `dateFrom`/`dateTo` se coercionan a
 * `Date`: el cliente envía instantes ISO (el borde del día en su zona horaria)
 * y el repositorio compara contra `created_at`, que es timestamptz. Es el mismo
 * criterio que `auditLogQuerySchema` y no el `z.iso.date` del historial de
 * cliente, donde el rango son días civiles de la tienda.
 */
export const adminOrderQuerySchema = z
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
    status: z
      .enum(ORDER_STATUSES, "El estado seleccionado no es válido.")
      .optional(),
    customerSearch: z
      .string("La búsqueda debe ser texto.")
      .trim()
      .max(100, "La búsqueda admite máximo 100 caracteres.")
      .optional(),
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

export type AdminOrderQueryInput = z.infer<typeof adminOrderQuerySchema>;

// Id de la orden tal como llega en la ruta del detalle: validar la forma antes
// del repositorio evita gastar una consulta con basura de la URL.
export const adminOrderIdSchema = z.uuid("La orden indicada no es válida.");

/**
 * Cuerpo del cambio manual de estado. `expectedStatus` es el estado que el
 * admin tenía en pantalla y viaja al WHERE del `UPDATE`: entre la lectura y la
 * confirmación el webhook de Stripe puede haber movido la orden, y sin ese dato
 * el cambio pisaría un estado que nadie revisó.
 *
 * Que `status` y `expectedStatus` sean distintos no se valida acá: es un 400 del
 * handler, no una forma inválida del cuerpo.
 */
export const updateOrderStatusSchema = z.object({
  status: z.enum(ORDER_STATUSES, "El estado seleccionado no es válido."),
  expectedStatus: z.enum(
    ORDER_STATUSES,
    "El estado actual indicado no es válido.",
  ),
});

export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;
