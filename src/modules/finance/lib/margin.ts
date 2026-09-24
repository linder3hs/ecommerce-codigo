/**
 * Margen de un producto: lo que queda del precio después del costo.
 *
 * Las dos funciones devuelven `null` en lugar de un número inventado cuando el
 * dato no alcanza. Ese `null` es lo que la tabla pinta como "—": un 0 diría
 * "vendo al costo" y un 100 % diría "todo es ganancia", y ninguna de las dos
 * afirmaciones se puede sostener sin conocer el costo.
 */

/** Margen absoluto en centavos. Negativo si el costo supera al precio (AC3). */
export function marginCents(
  priceCents: number,
  costCents: number | null,
): number | null {
  // Aritmética entera: los dos importes son centavos y la resta no puede
  // arrastrar deriva de float.
  return costCents === null ? null : priceCents - costCents;
}

/**
 * Margen como porcentaje del precio: `33.33` son 33,33 %. Es un valor de
 * presentación —lo único que no viaja como entero— y se deriva en el cliente;
 * por el cable solo van centavos.
 *
 * `priceCents === 0` devuelve `null` y no `Infinity`: un producto regalado no
 * tiene margen porcentual que enseñar, aunque su margen absoluto sí se calcula.
 */
export function marginPct(
  priceCents: number,
  costCents: number | null,
): number | null {
  const margin = marginCents(priceCents, costCents);

  if (margin === null || priceCents === 0) {
    return null;
  }

  return (margin * 100) / priceCents;
}
