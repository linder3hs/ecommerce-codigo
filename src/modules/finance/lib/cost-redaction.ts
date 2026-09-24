/**
 * Redacción del costo en las respuestas de producto. Vive aquí, y no en cada
 * handler, porque son cinco respuestas distintas las que devuelven una fila de
 * producto y cinco copias de la misma decisión se desincronizan en la primera
 * que alguien olvide.
 *
 * Quita la clave en vez de ponerla en `null`: `null` es un valor con significado
 * propio —costo desconocido, el que se muestra como "—"— y usarlo para "no
 * puedes verlo" haría que un producto con costo cargado pareciera no tenerlo.
 *
 * Módulo puro a propósito: sin `server-only`, sin repositorios y sin
 * `@/lib/permissions`. Quien llama ya resolvió el permiso y pasa el booleano.
 */
export type WithCostCents = { costCents: number | null };

export function redactCost<T extends WithCostCents>(
  row: T,
  canViewCost: boolean,
): T | Omit<T, "costCents"> {
  if (canViewCost) {
    return row;
  }

  // Copia y borrado en vez de rest destructuring: el rest dejaría una variable
  // con el costo que nadie usa, y el tipo del retorno —una unión donde una rama
  // no tiene la clave— es lo que obliga a quien la consume a comprobar si el
  // costo está antes de leerlo.
  const visible: Omit<T, "costCents"> & { costCents?: number | null } = {
    ...row,
  };

  delete visible.costCents;

  return visible;
}
