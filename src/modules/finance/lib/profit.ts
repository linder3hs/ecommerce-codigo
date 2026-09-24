import { netFromGrossCents } from "./tax";

import type { RevenueDayGross } from "./revenue-series";
import type { ProfitDailyPoint } from "../types/profit";

/** COGS de un día tal como sale de la BD: solo líneas con costo. */
export type CogsDay = Pick<ProfitDailyPoint, "day" | "cogsCents">;

/** Egresos vivos de un día tal como salen de la BD. */
export type ExpensesDay = Pick<ProfitDailyPoint, "day" | "expensesCents">;

/**
 * Utilidad del periodo. El IGV no aparece a propósito: ya salió al derivar el
 * neto del bruto, y restarlo acá lo descontaría dos veces.
 */
export function profitCents(
  netCents: number,
  cogsCents: number,
  expensesCents: number,
): number {
  return netCents - cogsCents - expensesCents;
}

function sumByDay<T extends { day: string }>(
  rows: T[],
  amount: (row: T) => number,
): Map<string, number> {
  const byDay = new Map<string, number>();

  for (const row of rows) {
    byDay.set(row.day, (byDay.get(row.day) ?? 0) + amount(row));
  }

  return byDay;
}

/**
 * Serie diaria completa: un punto por cada día de `days`, en ese orden. Las tres
 * consultas solo devuelven los días con movimiento; lo que falta es un 0, no un
 * hueco. Una fila fuera de `days` se descarta —el rango manda— y dos filas del
 * mismo día se suman.
 *
 * El neto se calcula una sola vez por día, sobre el bruto ya sumado.
 */
export function fillProfitByDay(
  days: string[],
  revenue: RevenueDayGross[],
  cogs: CogsDay[],
  expenses: ExpensesDay[],
): ProfitDailyPoint[] {
  const grossByDay = sumByDay(revenue, (row) => row.grossCents);
  const cogsByDay = sumByDay(cogs, (row) => row.cogsCents);
  const expensesByDay = sumByDay(expenses, (row) => row.expensesCents);

  return days.map((day) => {
    const netCents = netFromGrossCents(grossByDay.get(day) ?? 0);
    const dayCogs = cogsByDay.get(day) ?? 0;
    const dayExpenses = expensesByDay.get(day) ?? 0;

    return {
      day,
      netCents,
      cogsCents: dayCogs,
      expensesCents: dayExpenses,
      profitCents: profitCents(netCents, dayCogs, dayExpenses),
    };
  });
}

/**
 * COGS de una fila de producto. La suma de la BD ignora las líneas sin costo,
 * así que un producto con **todas** sus líneas sin costo llega con 0: ese 0 no
 * es "costo cero" sino "no se sabe", y viaja `null` para que la fila muestre
 * "—" en vez de un margen del 100 %.
 *
 * Con al menos una línea costeada el entero se devuelve tal cual, incluido un 0
 * real (mercadería regalada por el proveedor).
 */
export function cogsOrUnknown(
  cogsCents: number,
  units: number,
  unitsWithoutCost: number,
): number | null {
  return unitsWithoutCost === units ? null : cogsCents;
}
