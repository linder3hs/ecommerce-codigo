import type { DateRange } from "../types/order-history";

/**
 * Zona de la tienda como offset fijo: Lima no aplica horario de verano, así que
 * un desplazamiento constante es exacto y no arrastra la tabla de zonas.
 *
 * El día de una compra se calcula con este offset y no con `toISOString()`: una
 * compra de las 20:00 de Lima son las 01:00 UTC del día siguiente y el usuario
 * vería la fecha equivocada.
 */
export const STORE_UTC_OFFSET = "-05:00";

/**
 * El mismo calendario que `STORE_UTC_OFFSET`, con el nombre que entiende
 * Postgres (`at time zone`): los reportes que agrupan por día en SQL lo usan
 * para que sus claves coincidan con las de `rangeToInstants` y `toStoreDay`.
 * Si uno cambia, cambia el otro.
 */
export const STORE_TIME_ZONE = "America/Lima";

const OFFSET_MS = -5 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Tope del rango consultable. Coincide con el `refine` del schema de la API. */
export const MAX_RANGE_DAYS = 366;

/** Ventana del CTA "últimos 12 meses". 365 y no 366 para no rozar el tope. */
export const HISTORY_LOOKBACK_DAYS = 365;

// `timeZone: "UTC"` sobre una fecha ya desplazada al día civil de la tienda:
// servidor y navegador imprimen el mismo texto sin depender de su reloj local.
const dayLabelFormatter = new Intl.DateTimeFormat("es-PE", {
  timeZone: "UTC",
  day: "numeric",
  month: "long",
  year: "numeric",
});

/** Instante → día civil de la tienda: `2026-09-09`. */
export function toStoreDay(instant: Date): string {
  return new Date(instant.getTime() + OFFSET_MS).toISOString().slice(0, 10);
}

/** Hoy en el calendario de la tienda. Único punto que lee el reloj. */
export function todayInStore(): string {
  return toStoreDay(new Date());
}

/** Del día 1 del mes en curso a hoy. Es el rango por defecto del historial. */
export function currentMonthRange(): DateRange {
  const today = todayInStore();

  return { from: `${today.slice(0, 7)}-01`, to: today };
}

/** Los últimos `days` días contando hoy: `lastDaysRange(1)` es solo hoy. */
export function lastDaysRange(days: number): DateRange {
  const to = todayInStore();
  const from = new Date(`${to}T00:00:00Z`).getTime() - (days - 1) * DAY_MS;

  return { from: new Date(from).toISOString().slice(0, 10), to };
}

/**
 * Rango de días civiles → intervalo de instantes semiabierto `[from, to)`: el
 * extremo alto es el arranque del día siguiente a `to`, así que la consulta
 * incluye todo el último día sin depender de la precisión del timestamp.
 */
export function rangeToInstants(
  from: string,
  to: string,
): { fromInstant: Date; toInstant: Date } {
  const fromInstant = new Date(`${from}T00:00:00${STORE_UTC_OFFSET}`);
  const endOfTo = new Date(`${to}T00:00:00${STORE_UTC_OFFSET}`);

  return {
    fromInstant,
    toInstant: new Date(endOfTo.getTime() + DAY_MS),
  };
}

/** Días que abarca el rango, contando ambos extremos. */
export function rangeDays(from: string, to: string): number {
  const start = new Date(`${from}T00:00:00Z`).getTime();
  const end = new Date(`${to}T00:00:00Z`).getTime();

  return Math.floor((end - start) / DAY_MS) + 1;
}

/** Misma regla que valida la API, para deshabilitar el botón antes de pedir. */
export function isRangeValid(from: string, to: string): boolean {
  if (from === "" || to === "" || from > to) {
    return false;
  }

  const days = rangeDays(from, to);

  return Number.isFinite(days) && days <= MAX_RANGE_DAYS;
}

/** Día civil → "9 de septiembre de 2026". */
export function formatDayLabel(date: string): string {
  return dayLabelFormatter.format(new Date(`${date}T00:00:00Z`));
}
