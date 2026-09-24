import { z } from "zod";

import {
  amountInputSchema,
  centsSchema,
  productQuerySchema,
} from "@/modules/products/schemas/product.schema";

import { EXPENSE_CATEGORY_VALUES } from "../constants";

const categorySchema = z.enum(
  EXPENSE_CATEGORY_VALUES,
  "Selecciona una categoría válida.",
);

const MIN_AMOUNT_MESSAGE = "El monto debe ser mayor que cero.";

/**
 * Consulta del listado de egresos. La paginación sale de `productQuerySchema`
 * con un `pick`: dos definiciones de "página" discreparían en el primer cambio
 * de límites.
 *
 * Las fechas son días de calendario "YYYY-MM-DD", igual que `expense_date`, y
 * por eso se comparan como string: en ese formato el orden lexicográfico es el
 * cronológico.
 */
export const expenseQuerySchema = productQuerySchema
  .pick({ page: true, pageSize: true })
  .extend({
    category: categorySchema.optional(),
    dateFrom: z.iso.date("La fecha de inicio no es válida.").optional(),
    dateTo: z.iso.date("La fecha de fin no es válida.").optional(),
  })
  .refine(
    (value) =>
      !value.dateFrom || !value.dateTo || value.dateFrom <= value.dateTo,
    {
      path: ["dateTo"],
      message: "La fecha de fin no puede ser anterior a la de inicio.",
    },
  );

/**
 * Cuerpo del `POST`. Sin `createdBy`: el autor sale de la sesión en el handler y
 * un campo en el body sería una forma de atribuirle el gasto a otra persona.
 *
 * `description` es `nullable` y no `nullish`: el formulario manda `null` con el
 * campo vacío, igual que el costo de `updateCostFormSchema`.
 */
export const createExpenseSchema = z.object({
  category: categorySchema,
  amountCents: centsSchema("El monto").min(1, MIN_AMOUNT_MESSAGE),
  expenseDate: z.iso.date("La fecha no es válida."),
  description: z
    .string("La descripción debe ser texto.")
    .trim()
    .min(1, "La descripción no puede quedar en blanco.")
    .max(280, "La descripción admite máximo 280 caracteres.")
    .nullable(),
});

/**
 * Cuerpo del `PATCH`. Ausente = no tocar, `null` = borrar la descripción,
 * string = fijarla. Un body sin ningún campo es 400: no hay cambio que auditar.
 */
export const updateExpenseSchema = createExpenseSchema
  .partial()
  .refine(
    (value) => Object.values(value).some((field) => field !== undefined),
    "Envía al menos un campo para actualizar.",
  );

export const expenseIdSchema = z.uuid("El identificador no es válido.");

// El formulario captura soles ("1299,90") y el schema los convierte a centavos
// con el mismo helper que el de producto. El regex de `amountInputSchema` ya
// rechaza negativos y más de dos decimales; el cero lo rechaza el `refine`,
// porque "0" sí casa con el patrón.
export const expenseFormSchema = createExpenseSchema
  .omit({ amountCents: true })
  .extend({
    amount: amountInputSchema("El monto").refine(
      (cents) => cents > 0,
      MIN_AMOUNT_MESSAGE,
    ),
  });

export type ExpenseQueryInput = z.infer<typeof expenseQuerySchema>;
export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;
export type UpdateExpenseInput = z.infer<typeof updateExpenseSchema>;
export type ExpenseFormInput = z.input<typeof expenseFormSchema>;
export type ExpenseFormOutput = z.output<typeof expenseFormSchema>;
