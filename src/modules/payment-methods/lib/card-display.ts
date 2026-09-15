/**
 * Presentación de una tarjeta. Vive suelto porque la tarjeta se dibuja en dos
 * lugares —la lista del perfil y el selector del carrito— y la marca tiene que
 * leerse igual en los dos.
 *
 * No hay "primeros dígitos" en ningún lado a propósito: Stripe no los expone y
 * guardarlos violaría PCI-DSS. El estándar es marca + últimos cuatro.
 */

// Stripe devuelve la marca en minúsculas y sin acentos; el resto de marcas que
// pueda agregar a futuro cae en el `default` capitalizado.
const BRAND_LABELS: Record<string, string> = {
  amex: "American Express",
  diners: "Diners Club",
  discover: "Discover",
  eftpos_au: "Eftpos",
  jcb: "JCB",
  mastercard: "Mastercard",
  unionpay: "UnionPay",
  visa: "Visa",
  unknown: "Tarjeta",
};

export function brandLabel(brand: string): string {
  return BRAND_LABELS[brand] ?? brand.charAt(0).toUpperCase() + brand.slice(1);
}

export function maskedNumber(last4: string): string {
  return `•••• ${last4}`;
}

/** `MM/AAAA`, el formato impreso en la tarjeta salvo por el año completo. */
export function formatExpiry(expMonth: number, expYear: number): string {
  return `${String(expMonth).padStart(2, "0")}/${expYear}`;
}
