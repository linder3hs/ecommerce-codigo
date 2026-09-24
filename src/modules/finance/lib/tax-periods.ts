import { netFromGrossCents, taxFromGrossCents } from "./tax";

import type { RevenueDayGross } from "./revenue-series";
import type { TaxPeriod, TaxPeriodRow } from "../types/tax";
import type { DateRange } from "@/modules/orders/types/order-history";

// `timeZone: "UTC"` sobre medianoche UTC del día 1: servidor y navegador
// imprimen el mismo mes sin depender de su reloj local.
const monthLabelFormatter = new Intl.DateTimeFormat("es-PE", {
  timeZone: "UTC",
  month: "long",
  year: "numeric",
});

/**
 * Cómo se lee y se escribe cada periodicidad. `slot` es el número del periodo
 * dentro del año, desde 1: el mes (1–12) o el trimestre (1–4).
 */
type PeriodCalendar = {
  /** Meses que abarca un periodo. */
  months: number;
  toKey: (year: number, slot: number) => string;
  slotOfKey: (key: string) => number;
  toLabel: (year: number, slot: number) => string;
};

const CALENDARS: Record<TaxPeriod, PeriodCalendar> = {
  month: {
    months: 1,
    toKey: (year, slot) => `${year}-${String(slot).padStart(2, "0")}`,
    slotOfKey: (key) => Number(key.slice(5, 7)),
    toLabel: (year, slot) => {
      const label = monthLabelFormatter.format(
        new Date(Date.UTC(year, slot - 1, 1)),
      );

      return label.charAt(0).toUpperCase() + label.slice(1);
    },
  },
  quarter: {
    months: 3,
    toKey: (year, slot) => `${year}-Q${slot}`,
    slotOfKey: (key) => Number(key.slice(6)),
    toLabel: (year, slot) => `T${slot} ${year}`,
  },
};

function periodsPerYear(period: TaxPeriod): number {
  return 12 / CALENDARS[period].months;
}

/**
 * Índice lineal del periodo (periodos desde el año 0). Recorrer índices
 * consecutivos cruza el año sin casos especiales: diciembre + 1 es enero.
 */
function indexOfDay(day: string, period: TaxPeriod): number {
  const year = Number(day.slice(0, 4));
  const month = Number(day.slice(5, 7));

  return (
    year * periodsPerYear(period) +
    Math.floor((month - 1) / CALENDARS[period].months)
  );
}

function indexOfKey(key: string, period: TaxPeriod): number {
  return (
    Number(key.slice(0, 4)) * periodsPerYear(period) +
    CALENDARS[period].slotOfKey(key) -
    1
  );
}

function splitIndex(
  index: number,
  period: TaxPeriod,
): { year: number; slot: number } {
  const perYear = periodsPerYear(period);

  return { year: Math.floor(index / perYear), slot: (index % perYear) + 1 };
}

function keyOfIndex(index: number, period: TaxPeriod): string {
  const { year, slot } = splitIndex(index, period);

  return CALENDARS[period].toKey(year, slot);
}

/** Día civil de la tienda → clave de su periodo: `2026-09` o `2026-Q3`. */
export function taxPeriodKey(day: string, period: TaxPeriod): string {
  return keyOfIndex(indexOfDay(day, period), period);
}

/** Primer y último día civil del periodo completo, ambos incluidos. */
export function periodBounds(key: string, period: TaxPeriod): DateRange {
  const { year, slot } = splitIndex(indexOfKey(key, period), period);
  const { months } = CALENDARS[period];
  const firstMonth = (slot - 1) * months + 1;
  const lastMonth = firstMonth + months - 1;

  return {
    from: `${year}-${String(firstMonth).padStart(2, "0")}-01`,
    // Día 0 del mes siguiente = último día de `lastMonth` (`Date.UTC` cuenta
    // los meses desde 0): resuelve febrero y bisiestos sin tabla.
    to: new Date(Date.UTC(year, lastMonth, 0)).toISOString().slice(0, 10),
  };
}

/** Clave → texto de la fila: "Septiembre de 2026" o "T3 2026". */
export function formatPeriodLabel(key: string, period: TaxPeriod): string {
  const { year, slot } = splitIndex(indexOfKey(key, period), period);

  return CALENDARS[period].toLabel(year, slot);
}

/**
 * Claves de todo periodo que intersecta `[from, to]`, en orden cronológico. Un
 * rango invertido no tiene periodos.
 */
export function periodKeysInRange(
  from: string,
  to: string,
  period: TaxPeriod,
): string[] {
  if (from > to) {
    return [];
  }

  const keys: string[] = [];
  const last = indexOfDay(to, period);

  for (let index = indexOfDay(from, period); index <= last; index += 1) {
    keys.push(keyOfIndex(index, period));
  }

  return keys;
}

/**
 * Bruto diario → una fila por periodo del rango, con 0 donde no hubo ventas.
 * Un día fuera del rango se descarta —el rango manda— y los días de un mismo
 * periodo se suman antes de derivar neto e IGV, una sola vez por fila.
 *
 * `partial`: el periodo se sale del rango o su último día es hoy o posterior,
 * porque todavía puede recibir ventas. `today` entra por parámetro para que
 * esto no lea el reloj.
 */
export function bucketTaxByPeriod(
  rangeFrom: string,
  rangeTo: string,
  period: TaxPeriod,
  dailyGross: RevenueDayGross[],
  today: string,
): TaxPeriodRow[] {
  const grossByKey = new Map<string, number>();

  for (const row of dailyGross) {
    if (row.day < rangeFrom || row.day > rangeTo) {
      continue;
    }

    const key = taxPeriodKey(row.day, period);

    grossByKey.set(key, (grossByKey.get(key) ?? 0) + row.grossCents);
  }

  return periodKeysInRange(rangeFrom, rangeTo, period).map((key) => {
    const { from, to } = periodBounds(key, period);
    const grossCents = grossByKey.get(key) ?? 0;

    return {
      key,
      label: formatPeriodLabel(key, period),
      from,
      to,
      partial: from < rangeFrom || to > rangeTo || to >= today,
      grossCents,
      netCents: netFromGrossCents(grossCents),
      taxCents: taxFromGrossCents(grossCents),
    };
  });
}
