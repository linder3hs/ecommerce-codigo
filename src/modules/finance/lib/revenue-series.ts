import { netFromGrossCents } from "./tax";

import type { RevenueBreakdownRow, RevenueDailyPoint } from "../types/revenue";

const DAY_MS = 24 * 60 * 60 * 1000;

/** Etiqueta de la fila que agrupa todo lo que quedó fuera del top. */
export const OTHERS_LABEL = "Otros";

/** Bruto de un día tal como sale de la BD, sin neto. */
export type RevenueDayGross = Pick<RevenueDailyPoint, "day" | "grossCents">;

/** Fila del top tal como sale de la BD: siempre con id y sin neto. */
export type RevenueBreakdownGross = Omit<
  RevenueBreakdownRow,
  "id" | "netCents"
> & { id: string };

/** Lo que `appendOthersRow` necesita de los totales para calcular el resto. */
export type RevenueRemainderBase = { grossCents: number; units: number };

/**
 * Días civiles de la tienda de `from` a `to`, ambos incluidos y en orden
 * ascendente. Aritmética sobre el calendario (medianoche UTC de cada string), no
 * sobre instantes: el día de la tienda ya viene resuelto en el texto y no hay
 * horario de verano que salte. Un rango invertido no tiene días.
 */
export function storeDaysInRange(from: string, to: string): string[] {
  const start = new Date(`${from}T00:00:00Z`).getTime();
  const end = new Date(`${to}T00:00:00Z`).getTime();
  const days: string[] = [];

  for (let instant = start; instant <= end; instant += DAY_MS) {
    days.push(new Date(instant).toISOString().slice(0, 10));
  }

  return days;
}

/**
 * Serie diaria completa: un punto por cada día de `days`, en ese orden. Un día
 * que la consulta no devolvió es una venta de cero, no un hueco. Una fila fuera
 * de `days` se descarta —el rango manda— y dos filas del mismo día se suman.
 *
 * El neto se calcula una sola vez por día, sobre el bruto ya sumado.
 */
export function fillRevenueByDay(
  days: string[],
  rows: RevenueDayGross[],
): RevenueDailyPoint[] {
  const grossByDay = new Map<string, number>();

  for (const row of rows) {
    grossByDay.set(row.day, (grossByDay.get(row.day) ?? 0) + row.grossCents);
  }

  return days.map((day) => {
    const grossCents = grossByDay.get(day) ?? 0;

    return { day, grossCents, netCents: netFromGrossCents(grossCents) };
  });
}

/**
 * Top del desglose + fila "Otros" con el resto de los totales, para que la
 * columna bruto sume exactamente el bruto del rango (AC5).
 *
 * "Otros" solo aparece si queda bruto o unidades por repartir. Un resto
 * negativo —un pago confirmado entre la consulta de totales y la del desglose—
 * no se muestra: una fila con importe negativo sería más confusa que un
 * desfase de segundos que corrige el siguiente refresco.
 */
export function appendOthersRow(
  rows: RevenueBreakdownGross[],
  totals: RevenueRemainderBase,
): RevenueBreakdownRow[] {
  const top: RevenueBreakdownRow[] = rows.map((row) => ({
    ...row,
    netCents: netFromGrossCents(row.grossCents),
  }));

  const restGross =
    totals.grossCents - rows.reduce((sum, row) => sum + row.grossCents, 0);
  const restUnits =
    totals.units - rows.reduce((sum, row) => sum + row.units, 0);

  if (restGross < 0 || restUnits < 0 || (restGross === 0 && restUnits === 0)) {
    return top;
  }

  return [
    ...top,
    {
      id: null,
      label: OTHERS_LABEL,
      units: restUnits,
      grossCents: restGross,
      netCents: netFromGrossCents(restGross),
    },
  ];
}
