import { z } from "zod";

/**
 * El listado público de categorías no acepta parámetros todavía: devuelve las
 * activas ordenadas por nombre. El schema existe igual para que el handler
 * valide su entrada como todos los demás (regla 4 de `docs/SETUP.md`) y para
 * que agregar un filtro mañana no sea inventar la validación desde cero.
 * No es `strictObject`: un parámetro desconocido en la URL se ignora, no
 * rompe la landing con un 400.
 */
export const publicCategoryQuerySchema = z.object({});

export type PublicCategoryQueryInput = z.infer<
  typeof publicCategoryQuerySchema
>;
