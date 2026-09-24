// Pruebas unitarias de src/modules/finance/lib/profit.ts
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { cogsOrUnknown, fillProfitByDay, profitCents } from "./profit";
import { storeDaysInRange } from "./revenue-series";
import { rangeDays } from "@/modules/orders/lib/date-range";

describe("profitCents", () => {
  it("subtracts COGS and expenses from the net", () => {
    assert.equal(profitCents(10_000, 4_000, 1_500), 4_500);
  });

  it("does not subtract the IGV again: a gross of 118 is a net of 100 (AC3)", () => {
    const [point] = fillProfitByDay(
      ["2026-09-01"],
      [{ day: "2026-09-01", grossCents: 118 }],
      [{ day: "2026-09-01", cogsCents: 30 }],
      [{ day: "2026-09-01", expensesCents: 20 }],
    );

    assert.equal(point.netCents, 100);
    assert.equal(point.profitCents, 50);
  });

  it("goes negative when costs exceed the net", () => {
    assert.equal(profitCents(1_000, 800, 500), -300);
  });
});

describe("fillProfitByDay", () => {
  const days = ["2026-09-01", "2026-09-02", "2026-09-03"];

  it("returns one point per day in order, with the four values in 0 on days without movement (AC7)", () => {
    assert.deepEqual(
      fillProfitByDay(
        days,
        [{ day: "2026-09-01", grossCents: 118 }],
        [{ day: "2026-09-01", cogsCents: 40 }],
        [{ day: "2026-09-03", expensesCents: 25 }],
      ),
      [
        {
          day: "2026-09-01",
          netCents: 100,
          cogsCents: 40,
          expensesCents: 0,
          profitCents: 60,
        },
        {
          day: "2026-09-02",
          netCents: 0,
          cogsCents: 0,
          expensesCents: 0,
          profitCents: 0,
        },
        {
          day: "2026-09-03",
          netCents: 0,
          cogsCents: 0,
          expensesCents: 25,
          profitCents: -25,
        },
      ],
    );
  });

  it("has exactly rangeDays(from, to) points for a full month with no rows (AC7)", () => {
    const series = fillProfitByDay(
      storeDaysInRange("2026-09-01", "2026-09-30"),
      [],
      [],
      [],
    );

    assert.equal(series.length, rangeDays("2026-09-01", "2026-09-30"));
    assert.ok(
      series.every(
        (point) =>
          point.netCents === 0 &&
          point.cogsCents === 0 &&
          point.expensesCents === 0 &&
          point.profitCents === 0,
      ),
    );
  });

  it("discards rows outside the days of the range", () => {
    const series = fillProfitByDay(
      ["2026-09-02"],
      [{ day: "2026-09-01", grossCents: 118 }],
      [{ day: "2026-09-03", cogsCents: 40 }],
      [{ day: "2026-08-31", expensesCents: 25 }],
    );

    assert.deepEqual(series, [
      {
        day: "2026-09-02",
        netCents: 0,
        cogsCents: 0,
        expensesCents: 0,
        profitCents: 0,
      },
    ]);
  });

  it("adds up duplicated rows of the same day before deriving the net once", () => {
    const [point] = fillProfitByDay(
      ["2026-09-01"],
      [
        { day: "2026-09-01", grossCents: 59 },
        { day: "2026-09-01", grossCents: 59 },
      ],
      [
        { day: "2026-09-01", cogsCents: 10 },
        { day: "2026-09-01", cogsCents: 5 },
      ],
      [
        { day: "2026-09-01", expensesCents: 3 },
        { day: "2026-09-01", expensesCents: 2 },
      ],
    );

    assert.equal(point.netCents, 100);
    assert.equal(point.cogsCents, 15);
    assert.equal(point.expensesCents, 5);
    assert.equal(point.profitCents, 80);
  });

  it("rounds the net once per day and not per row", () => {
    // Por fila serían 42 + 42 = 84; sobre el bruto del día ya sumado, 85.
    const [point] = fillProfitByDay(
      ["2026-09-01"],
      [
        { day: "2026-09-01", grossCents: 50 },
        { day: "2026-09-01", grossCents: 50 },
      ],
      [],
      [],
    );

    assert.equal(point.netCents, 85);
  });

  it("returns no points for an empty list of days", () => {
    assert.deepEqual(
      fillProfitByDay([], [{ day: "2026-09-01", grossCents: 118 }], [], []),
      [],
    );
  });
});

describe("cogsOrUnknown", () => {
  it("returns null when every unit of the product lacks a cost (AC5)", () => {
    assert.equal(cogsOrUnknown(0, 3, 3), null);
  });

  it("keeps a real zero cost as 0 when every line has a cost", () => {
    assert.equal(cogsOrUnknown(0, 3, 0), 0);
  });

  it("returns the known COGS when only some units lack a cost (AC4)", () => {
    assert.equal(cogsOrUnknown(500, 3, 1), 500);
  });

  it("returns the known COGS when every line has a cost", () => {
    assert.equal(cogsOrUnknown(1_200, 4, 0), 1_200);
  });
});
