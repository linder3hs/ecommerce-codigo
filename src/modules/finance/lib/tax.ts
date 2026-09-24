/**
 * IGV peruano. Los precios de la tienda ya lo incluyen: el importe cobrado es el
 * bruto y el neto se deriva dividiendo, nunca sumando.
 */
export const IGV_PERCENT = 18;

/**
 * Bruto con IGV → neto sin IGV, en centavos enteros.
 *
 * Se aplica **una sola vez sobre un bucket ya sumado** (el total del rango, un
 * día, una fila del desglose), nunca por orden ni por línea: redondear antes de
 * sumar acumula hasta un centavo de error por cada sumando.
 */
export function netFromGrossCents(grossCents: number): number {
  return Math.round((grossCents * 100) / (100 + IGV_PERCENT));
}

/**
 * IGV contenido en un bruto. Es la resta y no un segundo redondeo: así
 * `neto + IGV === bruto` siempre, sin centavos perdidos ni inventados.
 */
export function taxFromGrossCents(grossCents: number): number {
  return grossCents - netFromGrossCents(grossCents);
}
