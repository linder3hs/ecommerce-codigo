import { z } from "zod";

import {
  amountInputSchema,
  centsSchema,
  productQuerySchema,
} from "@/modules/products/schemas/product.schema";

/**
 * Consulta del listado de precio unitario. Se deriva del schema de productos con
 * un `pick`: es el mismo listado paginado por detrás (`productRepository.list`) y
 * dos definiciones de "página" discreparían en el primer cambio de límites.
 *
 * Sin `sortBy`: el orden lo fija el servidor (`UNIT_PRICE_DEFAULT_QUERY`) porque
 * el margen no es columna y no se puede ordenar por él en SQL.
 */
export const unitPriceQuerySchema = productQuerySchema.pick({
  page: true,
  pageSize: true,
  search: true,
});

/**
 * Cuerpo del `PATCH` de costo. `null` es explícito y válido: es la forma de
 * decir "el costo volvió a ser desconocido", distinta de 0, que es un costo
 * conocido de cero. `nullable` y no `nullish`: omitir el campo no es lo mismo
 * que borrarlo, y un body vacío tiene que ser 400.
 */
export const updateCostSchema = z.object({
  costCents: centsSchema("El costo").nullable(),
});

// El diálogo captura soles ("1299,90") y el schema los convierte a centavos con
// el mismo helper que el formulario de producto. El campo vacío llega como
// `null` desde el `setValueAs`, no como "": así el vacío no choca con el regex
// del monto y significa costo desconocido.
export const updateCostFormSchema = z.object({
  cost: amountInputSchema("El costo").nullable(),
});

export type UnitPriceQueryInput = z.infer<typeof unitPriceQuerySchema>;
export type UpdateCostInput = z.infer<typeof updateCostSchema>;
export type UpdateCostFormInput = z.input<typeof updateCostFormSchema>;
export type UpdateCostFormOutput = z.output<typeof updateCostFormSchema>;
