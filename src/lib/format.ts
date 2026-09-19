// Los precios se persisten en centavos (integer). Estos helpers son el único
// puente entre esos enteros y el texto que ve o escribe el usuario: nada de
// aritmética con floats en el camino.

const CURRENCY_PREFIX = "S/";

// Agrupación con punto y decimales con coma, como fija el AC9 del spec 002.
// No se usa `style: "currency"` porque cada locale coloca el símbolo distinto.
const wholeFormatter = new Intl.NumberFormat("es-ES", {
  useGrouping: true,
  maximumFractionDigits: 0,
});

// Hasta 7 dígitos enteros: 9999999,99 son 999.999.999 centavos, por debajo del
// máximo de un integer de Postgres (2.147.483.647). Con 8 o más dígitos el
// monto desbordaría la columna al insertar.
export const AMOUNT_INPUT_PATTERN = /^\d{1,7}(?:[.,]\d{1,2})?$/;

/**
 * Convierte un monto decimal escrito por el usuario ("1299,90") a centavos.
 * Parsea el string por partes en vez de `Math.round(value * 100)`: multiplicar
 * un float arrastra deriva (19.99 * 100 = 1998.9999...).
 */
export function toCents(input: string): number | null {
  const normalized = input.trim().replace(",", ".");
  const match = AMOUNT_INPUT_PATTERN.exec(normalized);

  if (!match) {
    return null;
  }

  const [whole, fraction = ""] = normalized.split(".");

  return Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
}

/** Centavos → texto para mostrar: 129990 → "S/ 1.299,90". */
export function formatCents(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  const absolute = Math.abs(cents);
  // Entero y decimales se separan con aritmética entera: dividir por 100 antes
  // de formatear volvería a meter un float en el camino.
  const fraction = String(absolute % 100).padStart(2, "0");
  // (absolute - resto) / 100 es una división exacta en IEEE754: nunca redondea.
  const whole = wholeFormatter.format((absolute - (absolute % 100)) / 100);

  return `${CURRENCY_PREFIX} ${sign}${whole},${fraction}`;
}

/** Centavos → texto editable en un input: 129990 → "1299.90". */
export function centsToAmountInput(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  const absolute = Math.abs(cents);

  const fraction = String(absolute % 100).padStart(2, "0");

  return `${sign}${(absolute - (absolute % 100)) / 100}.${fraction}`;
}
