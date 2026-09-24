// Formateo de datos persistidos al texto que ve o escribe el usuario. Los
// precios se guardan en centavos (integer) y estos helpers son el único puente
// entre esos enteros y la pantalla: nada de aritmética con floats en el camino.

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

// Un decimal: el margen porcentual es una lectura de negocio, no un importe, y
// dos decimales sugerirían una precisión que el redondeo del costo no sostiene.
const pctFormatter = new Intl.NumberFormat("es-ES", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

/** Porcentaje ya multiplicado por 100 → texto: 33.333 → "33,3 %". */
export function formatPct(value: number): string {
  return `${pctFormatter.format(value)} %`;
}

/** Centavos → texto editable en un input: 129990 → "1299.90". */
export function centsToAmountInput(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  const absolute = Math.abs(cents);

  const fraction = String(absolute % 100).padStart(2, "0");

  return `${sign}${(absolute - (absolute % 100)) / 100}.${fraction}`;
}

/** Las dos columnas de nombre de `users`, ambas nullable en el schema. */
export type CustomerNameParts = {
  firstName: string | null;
  lastName: string | null;
};

/**
 * Nombre completo a partir de las partes guardadas. `fallback` es lo que se
 * devuelve cuando la cuenta no tiene nombre y es obligatorio porque los
 * consumidores no son intercambiables: el panel muestra "Sin nombre", el
 * listado de usuarios cae al email (`null`) y el Customer de Stripe deja el
 * campo ausente (`undefined`) —un recibo que dijera "Sin nombre" sería un dato
 * inventado—. Sin valor por defecto a propósito: un default se dispararía al
 * pasar `undefined` explícito y devolvería texto donde se pidió ausencia.
 */
export function formatCustomerName<TFallback>(
  parts: CustomerNameParts,
  fallback: TFallback,
): string | TFallback {
  const name = [parts.firstName, parts.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();

  return name.length > 0 ? name : fallback;
}
