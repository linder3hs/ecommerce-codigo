// Pruebas unitarias de src/modules/finance/lib/revenue-series.ts
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  appendOthersRow,
  fillRevenueByDay,
  OTHERS_LABEL,
  storeDaysInRange,
} from "./revenue-series";
import { rangeDays } from "@/modules/orders/lib/date-range";

import type { RevenueBreakdownGross } from "./revenue-series";

const PRODUCT_A = "3f2504e0-4f89-41d3-9a0c-0305e82c3301";
const PRODUCT_B = "3f2504e0-4f89-41d3-9a0c-0305e82c3302";

describe("storeDaysInRange", () => {
  it("returns a single day when from and to match", () => {
    assert.deepEqual(storeDaysInRange("2026-09-09", "2026-09-09"), [
      "2026-09-09",
    ]);
  });

  it("walks across a month boundary in ascending order", () => {
    assert.deepEqual(storeDaysInRange("2026-09-29", "2026-10-02"), [
      "2026-09-29",
      "2026-09-30",
      "2026-10-01",
      "2026-10-02",
    ]);
  });

  it("includes the leap day", () => {
    assert.deepEqual(storeDaysInRange("2028-02-28", "2028-03-01"), [
      "2028-02-28",
      "2028-02-29",
      "2028-03-01",
    ]);
  });

  it("has exactly rangeDays(from, to) points, even for a full leap year (AC4)", () => {
    for (const [from, to] of [
      ["2026-09-01", "2026-09-30"],
      ["2026-01-01", "2026-12-31"],
      ["2028-01-01", "2028-12-31"],
    ] as const) {
      assert.equal(storeDaysInRange(from, to).length, rangeDays(from, to));
    }
  });

  it("returns no days for an inverted range", () => {
    assert.deepEqual(storeDaysInRange("2026-09-10", "2026-09-09"), []);
  });
});

describe("fillRevenueByDay", () => {
  const days = ["2026-09-01", "2026-09-02", "2026-09-03"];

  it("fills the days without sales with 0 gross and 0 net (AC4)", () => {
    assert.deepEqual(
      fillRevenueByDay(days, [{ day: "2026-09-02", grossCents: 118 }]),
      [
        { day: "2026-09-01", grossCents: 0, netCents: 0 },
        { day: "2026-09-02", grossCents: 118, netCents: 100 },
        { day: "2026-09-03", grossCents: 0, netCents: 0 },
      ],
    );
  });

  it("returns one zero point per day when there are no rows", () => {
    const series = fillRevenueByDay(days, []);

    assert.equal(series.length, days.length);
    assert.ok(series.every((point) => point.grossCents === 0));
  });

  it("drops rows outside the requested days", () => {
    const series = fillRevenueByDay(days, [
      { day: "2026-08-31", grossCents: 500 },
      { day: "2026-09-04", grossCents: 500 },
    ]);

    assert.equal(
      series.reduce((sum, point) => sum + point.grossCents, 0),
      0,
    );
  });

  it("sums two rows of the same day and rounds the net once on the sum", () => {
    // Por fila serían 3 + 3 = 6; sobre el bucket sumado, round(600 / 118) = 5.
    const [first] = fillRevenueByDay(
      ["2026-09-01"],
      [
        { day: "2026-09-01", grossCents: 3 },
        { day: "2026-09-01", grossCents: 3 },
      ],
    );

    assert.deepEqual(first, { day: "2026-09-01", grossCents: 6, netCents: 5 });
  });
});

describe("appendOthersRow", () => {
  const top: RevenueBreakdownGross[] = [
    { id: PRODUCT_A, label: "Teclado", units: 3, grossCents: 300 },
    { id: PRODUCT_B, label: "Mouse", units: 2, grossCents: 118 },
  ];

  it("appends an 'Otros' row with id null carrying the remainder, last", () => {
    const rows = appendOthersRow(top, { grossCents: 536, units: 9 });

    assert.equal(rows.length, 3);
    assert.deepEqual(rows[2], {
      id: null,
      label: OTHERS_LABEL,
      units: 4,
      grossCents: 118,
      netCents: 100,
    });
  });

  it("makes the gross column add up exactly to the totals gross (AC5)", () => {
    const totals = { grossCents: 10_001, units: 40 };
    const rows = appendOthersRow(top, totals);

    assert.equal(
      rows.reduce((sum, row) => sum + row.grossCents, 0),
      totals.grossCents,
    );
  });

  it("derives the net of every row from its own gross", () => {
    const rows = appendOthersRow(top, { grossCents: 418, units: 5 });

    assert.deepEqual(
      rows.map((row) => row.netCents),
      [254, 100],
    );
  });

  it("adds no 'Otros' row when nothing is left", () => {
    const rows = appendOthersRow(top, { grossCents: 418, units: 5 });

    assert.equal(rows.length, 2);
    assert.ok(rows.every((row) => row.id !== null));
  });

  it("adds 'Otros' when only units remain (a zero-priced sale)", () => {
    const rows = appendOthersRow(top, { grossCents: 418, units: 7 });

    assert.deepEqual(rows[2], {
      id: null,
      label: OTHERS_LABEL,
      units: 2,
      grossCents: 0,
      netCents: 0,
    });
  });

  it("omits 'Otros' when the remainder is negative (a payment landed between queries)", () => {
    assert.equal(appendOthersRow(top, { grossCents: 400, units: 9 }).length, 2);
    assert.equal(appendOthersRow(top, { grossCents: 500, units: 4 }).length, 2);
  });

  it("returns an empty breakdown for a range without sales", () => {
    assert.deepEqual(appendOthersRow([], { grossCents: 0, units: 0 }), []);
  });
});
