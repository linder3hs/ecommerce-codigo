// Pruebas unitarias de src/modules/dashboard/lib/series.ts
//
// `now` se pasa siempre fijo: una serie que depende del reloj de la máquina es
// un test que falla solo a medianoche.
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { SALES_WINDOW_DAYS } from "../constants";
import {
  fillOrdersByStatus,
  fillSalesByDay,
  lastUtcDays,
  toUtcDay,
} from "./series";

describe("toUtcDay", () => {
  it("turns an instant into its UTC civil day", () => {
    assert.equal(toUtcDay(new Date("2026-09-16T12:00:00.000Z")), "2026-09-16");
  });

  it("keeps a late-evening instant on its UTC day, not on the store's", () => {
    // 23:30 UTC del 16 son las 18:30 del 16 en Lima: acá coinciden.
    assert.equal(toUtcDay(new Date("2026-09-16T23:30:00.000Z")), "2026-09-16");
  });

  it("puts an after-midnight-UTC instant on the next day, where the store day would still be the previous one", () => {
    // 00:30 UTC del 17 son las 19:30 del 16 en Lima. La serie del dashboard
    // agrega en UTC, así que este punto es del 17.
    assert.equal(toUtcDay(new Date("2026-09-17T00:30:00.000Z")), "2026-09-17");
  });

  it("is exact on both edges of the UTC day", () => {
    assert.equal(toUtcDay(new Date("2026-09-16T00:00:00.000Z")), "2026-09-16");
    assert.equal(toUtcDay(new Date("2026-09-16T23:59:59.999Z")), "2026-09-16");
  });
});

describe("lastUtcDays", () => {
  it("returns only today for a window of one day", () => {
    assert.deepEqual(lastUtcDays(1, new Date("2026-09-16T10:00:00.000Z")), [
      "2026-09-16",
    ]);
  });

  it("returns the days in ascending order, today last", () => {
    assert.deepEqual(lastUtcDays(3, new Date("2026-09-16T10:00:00.000Z")), [
      "2026-09-14",
      "2026-09-15",
      "2026-09-16",
    ]);
  });

  it("crosses a month boundary", () => {
    assert.deepEqual(lastUtcDays(3, new Date("2026-10-01T10:00:00.000Z")), [
      "2026-09-29",
      "2026-09-30",
      "2026-10-01",
    ]);
  });

  it("crosses a year boundary", () => {
    assert.deepEqual(lastUtcDays(2, new Date("2027-01-01T05:00:00.000Z")), [
      "2026-12-31",
      "2027-01-01",
    ]);
  });

  it("includes the 29th of a leap February", () => {
    assert.deepEqual(lastUtcDays(3, new Date("2028-03-01T00:00:00.000Z")), [
      "2028-02-28",
      "2028-02-29",
      "2028-03-01",
    ]);
  });

  it("uses the UTC day of `now` even at the edges of the day", () => {
    assert.deepEqual(lastUtcDays(2, new Date("2026-09-16T23:59:59.999Z")), [
      "2026-09-15",
      "2026-09-16",
    ]);
    assert.deepEqual(lastUtcDays(2, new Date("2026-09-17T00:00:00.000Z")), [
      "2026-09-16",
      "2026-09-17",
    ]);
  });

  it("returns exactly SALES_WINDOW_DAYS days for the dashboard window", () => {
    const days = lastUtcDays(
      SALES_WINDOW_DAYS,
      new Date("2026-09-16T10:00:00.000Z"),
    );

    assert.equal(days.length, 30);
    assert.equal(days[0], "2026-08-18");
    assert.equal(days[29], "2026-09-16");
  });

  it("returns no days for a window smaller than one", () => {
    assert.deepEqual(lastUtcDays(0, new Date("2026-09-16T10:00:00.000Z")), []);
    assert.deepEqual(lastUtcDays(-5, new Date("2026-09-16T10:00:00.000Z")), []);
  });

  it("never repeats a day", () => {
    const days = lastUtcDays(
      SALES_WINDOW_DAYS,
      new Date("2026-09-16T10:00:00.000Z"),
    );

    assert.equal(new Set(days).size, days.length);
  });
});

describe("fillSalesByDay", () => {
  const NOW = new Date("2026-09-16T10:00:00.000Z");

  it("fills the whole window with zeros when there are no paid orders", () => {
    const series = fillSalesByDay([], 3, NOW);

    assert.deepEqual(series, [
      { day: "2026-09-14", totalCents: 0 },
      { day: "2026-09-15", totalCents: 0 },
      { day: "2026-09-16", totalCents: 0 },
    ]);
  });

  it("merges a point of the window and zeroes the rest", () => {
    const series = fillSalesByDay(
      [{ day: "2026-09-15", totalCents: 25_990 }],
      3,
      NOW,
    );

    assert.deepEqual(series, [
      { day: "2026-09-14", totalCents: 0 },
      { day: "2026-09-15", totalCents: 25_990 },
      { day: "2026-09-16", totalCents: 0 },
    ]);
  });

  it("keeps the points in ascending order no matter the order they arrive in", () => {
    const series = fillSalesByDay(
      [
        { day: "2026-09-16", totalCents: 300 },
        { day: "2026-09-14", totalCents: 100 },
      ],
      3,
      NOW,
    );

    assert.deepEqual(
      series.map((point) => point.day),
      ["2026-09-14", "2026-09-15", "2026-09-16"],
    );
    assert.deepEqual(
      series.map((point) => point.totalCents),
      [100, 0, 300],
    );
  });

  it("drops a point older than the window so the series always has exactly `days` points", () => {
    const series = fillSalesByDay(
      [
        { day: "2026-08-01", totalCents: 999_999 },
        { day: "2026-09-16", totalCents: 100 },
      ],
      3,
      NOW,
    );

    assert.equal(series.length, 3);
    assert.equal(
      series.some((point) => point.day === "2026-08-01"),
      false,
    );
    assert.equal(
      series.reduce((sum, point) => sum + point.totalCents, 0),
      100,
    );
  });

  it("drops a point in the future, which the query should never return", () => {
    const series = fillSalesByDay(
      [{ day: "2026-09-17", totalCents: 500 }],
      3,
      NOW,
    );

    assert.equal(series.length, 3);
    assert.deepEqual(
      series.map((point) => point.totalCents),
      [0, 0, 0],
    );
  });

  it("adds up two points of the same day instead of losing one", () => {
    const series = fillSalesByDay(
      [
        { day: "2026-09-16", totalCents: 100 },
        { day: "2026-09-16", totalCents: 250 },
      ],
      2,
      NOW,
    );

    assert.deepEqual(series, [
      { day: "2026-09-15", totalCents: 0 },
      { day: "2026-09-16", totalCents: 350 },
    ]);
  });

  it("defaults to the 30-day window of the dashboard", () => {
    const series = fillSalesByDay(
      [{ day: "2026-09-16", totalCents: 100 }],
      undefined,
      NOW,
    );

    assert.equal(series.length, SALES_WINDOW_DAYS);
    assert.equal(series[0].day, "2026-08-18");
    assert.equal(series[SALES_WINDOW_DAYS - 1].totalCents, 100);
  });

  it("returns an empty series for a window smaller than one day", () => {
    assert.deepEqual(
      fillSalesByDay([{ day: "2026-09-16", totalCents: 100 }], 0, NOW),
      [],
    );
  });

  it("does not mutate the points it was given", () => {
    const points = [{ day: "2026-09-16", totalCents: 100 }];
    const snapshot = structuredClone(points);

    fillSalesByDay(points, 3, NOW);

    assert.deepEqual(points, snapshot);
  });

  it("returns new objects instead of aliasing the incoming points", () => {
    const point = { day: "2026-09-16", totalCents: 100 };
    const series = fillSalesByDay([point], 1, NOW);

    assert.equal(Object.is(series[0], point), false);
  });
});

describe("fillOrdersByStatus", () => {
  it("returns the three statuses at zero when there are no orders", () => {
    assert.deepEqual(fillOrdersByStatus([]), [
      { status: "pending", total: 0 },
      { status: "paid", total: 0 },
      { status: "payment_failed", total: 0 },
    ]);
  });

  it("zeroes only the statuses the query did not return", () => {
    assert.deepEqual(fillOrdersByStatus([{ status: "paid", total: 7 }]), [
      { status: "pending", total: 0 },
      { status: "paid", total: 7 },
      { status: "payment_failed", total: 0 },
    ]);
  });

  it("always emits the lifecycle order, whatever order the rows arrive in", () => {
    const bars = fillOrdersByStatus([
      { status: "payment_failed", total: 1 },
      { status: "pending", total: 2 },
      { status: "paid", total: 3 },
    ]);

    assert.deepEqual(bars, [
      { status: "pending", total: 2 },
      { status: "paid", total: 3 },
      { status: "payment_failed", total: 1 },
    ]);
  });

  it("adds up two rows of the same status", () => {
    const bars = fillOrdersByStatus([
      { status: "paid", total: 2 },
      { status: "paid", total: 5 },
    ]);

    assert.deepEqual(bars[1], { status: "paid", total: 7 });
  });

  it("always returns exactly three bars", () => {
    assert.equal(fillOrdersByStatus([]).length, 3);
    assert.equal(
      fillOrdersByStatus([{ status: "pending", total: 1 }]).length,
      3,
    );
  });

  it("does not mutate the rows it was given", () => {
    const rows = [{ status: "paid" as const, total: 7 }];
    const snapshot = structuredClone(rows);

    fillOrdersByStatus(rows);

    assert.deepEqual(rows, snapshot);
  });
});
