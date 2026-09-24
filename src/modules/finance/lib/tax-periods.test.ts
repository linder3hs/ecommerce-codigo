// Pruebas unitarias de src/modules/finance/lib/tax-periods.ts
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  bucketTaxByPeriod,
  formatPeriodLabel,
  periodBounds,
  periodKeysInRange,
  taxPeriodKey,
} from "./tax-periods";

import type { TaxPeriodRow } from "../types/tax";

// Un "hoy" lejano en el futuro: ningún periodo de las fechas de prueba sigue
// abierto, así que `partial` solo depende del recorte del rango.
const FAR_FUTURE = "2099-01-01";

describe("taxPeriodKey", () => {
  it("keys a day by its month", () => {
    assert.equal(taxPeriodKey("2026-09-23", "month"), "2026-09");
    assert.equal(taxPeriodKey("2026-01-01", "month"), "2026-01");
    assert.equal(taxPeriodKey("2026-12-31", "month"), "2026-12");
  });

  it("puts the first and last day of each quarter in that quarter", () => {
    const cases: [string, string][] = [
      ["2026-01-01", "2026-Q1"],
      ["2026-03-31", "2026-Q1"],
      ["2026-04-01", "2026-Q2"],
      ["2026-06-30", "2026-Q2"],
      ["2026-07-01", "2026-Q3"],
      ["2026-09-30", "2026-Q3"],
      ["2026-10-01", "2026-Q4"],
      ["2026-12-31", "2026-Q4"],
    ];

    for (const [day, key] of cases) {
      assert.equal(taxPeriodKey(day, "quarter"), key, day);
    }
  });
});

describe("periodBounds", () => {
  it("returns the full calendar month", () => {
    assert.deepEqual(periodBounds("2026-09", "month"), {
      from: "2026-09-01",
      to: "2026-09-30",
    });
    assert.deepEqual(periodBounds("2026-12", "month"), {
      from: "2026-12-01",
      to: "2026-12-31",
    });
  });

  it("ends February on the 28th, or the 29th in a leap year", () => {
    assert.equal(periodBounds("2026-02", "month").to, "2026-02-28");
    assert.equal(periodBounds("2028-02", "month").to, "2028-02-29");
  });

  it("returns the limits of Q1 to Q4", () => {
    assert.deepEqual(periodBounds("2026-Q1", "quarter"), {
      from: "2026-01-01",
      to: "2026-03-31",
    });
    assert.deepEqual(periodBounds("2026-Q2", "quarter"), {
      from: "2026-04-01",
      to: "2026-06-30",
    });
    assert.deepEqual(periodBounds("2026-Q3", "quarter"), {
      from: "2026-07-01",
      to: "2026-09-30",
    });
    assert.deepEqual(periodBounds("2026-Q4", "quarter"), {
      from: "2026-10-01",
      to: "2026-12-31",
    });
  });
});

describe("formatPeriodLabel", () => {
  it("labels a month with its Peruvian Spanish name, capitalized", () => {
    assert.equal(formatPeriodLabel("2026-09", "month"), "Setiembre de 2026");
    assert.equal(formatPeriodLabel("2027-01", "month"), "Enero de 2027");
  });

  it("labels a quarter as T<n> <year>", () => {
    assert.equal(formatPeriodLabel("2026-Q3", "quarter"), "T3 2026");
    assert.equal(formatPeriodLabel("2027-Q1", "quarter"), "T1 2027");
  });
});

describe("periodKeysInRange", () => {
  it("returns a single period for a one-day range", () => {
    assert.deepEqual(periodKeysInRange("2026-09-23", "2026-09-23", "month"), [
      "2026-09",
    ]);
    assert.deepEqual(periodKeysInRange("2026-09-23", "2026-09-23", "quarter"), [
      "2026-Q3",
    ]);
  });

  it("walks months across the year boundary in chronological order", () => {
    assert.deepEqual(periodKeysInRange("2026-11-15", "2027-02-03", "month"), [
      "2026-11",
      "2026-12",
      "2027-01",
      "2027-02",
    ]);
  });

  it("walks quarters across the year boundary in chronological order", () => {
    assert.deepEqual(periodKeysInRange("2026-12-31", "2027-01-01", "quarter"), [
      "2026-Q4",
      "2027-Q1",
    ]);
    assert.deepEqual(periodKeysInRange("2026-02-10", "2027-02-09", "quarter"), [
      "2026-Q1",
      "2026-Q2",
      "2026-Q3",
      "2026-Q4",
      "2027-Q1",
    ]);
  });

  it("returns no periods for an inverted range", () => {
    assert.deepEqual(
      periodKeysInRange("2026-10-01", "2026-09-30", "month"),
      [],
    );
  });
});

describe("bucketTaxByPeriod", () => {
  it("derives net 100 and IGV 18 from a gross of 118", () => {
    const [row] = bucketTaxByPeriod(
      "2026-08-01",
      "2026-08-31",
      "month",
      [{ day: "2026-08-10", grossCents: 118 }],
      FAR_FUTURE,
    );

    assert.equal(row?.grossCents, 118);
    assert.equal(row?.netCents, 100);
    assert.equal(row?.taxCents, 18);
  });

  it("fills every period without sales with zeros, in order", () => {
    const rows = bucketTaxByPeriod(
      "2026-06-01",
      "2026-09-30",
      "month",
      [{ day: "2026-08-10", grossCents: 118 }],
      FAR_FUTURE,
    );

    assert.deepEqual(
      rows.map((row) => [row.key, row.grossCents, row.netCents, row.taxCents]),
      [
        ["2026-06", 0, 0, 0],
        ["2026-07", 0, 0, 0],
        ["2026-08", 118, 100, 18],
        ["2026-09", 0, 0, 0],
      ],
    );
  });

  it("sums the days of a period before rounding, once per row", () => {
    // Tres días de 3 centavos. Redondeando por día: neto 3 cada uno → 9 e IGV
    // 0. Sumando primero: bruto 9 → neto 8 e IGV 1.
    const [row] = bucketTaxByPeriod(
      "2026-08-01",
      "2026-08-31",
      "month",
      [
        { day: "2026-08-01", grossCents: 3 },
        { day: "2026-08-15", grossCents: 3 },
        { day: "2026-08-31", grossCents: 3 },
      ],
      FAR_FUTURE,
    );

    assert.equal(row?.grossCents, 9);
    assert.equal(row?.netCents, 8);
    assert.equal(row?.taxCents, 1);
  });

  it("keeps net + IGV equal to gross on every row", () => {
    const rows = bucketTaxByPeriod(
      "2026-01-01",
      "2026-12-31",
      "quarter",
      [
        { day: "2026-02-03", grossCents: 1 },
        { day: "2026-05-20", grossCents: 99_999 },
        { day: "2026-08-07", grossCents: 12_345 },
        { day: "2026-11-30", grossCents: 7 },
      ],
      FAR_FUTURE,
    );

    for (const row of rows) {
      assert.equal(row.netCents + row.taxCents, row.grossCents, row.key);
    }
  });

  it("buckets days by quarter with the full calendar bounds per row", () => {
    const rows = bucketTaxByPeriod(
      "2026-03-31",
      "2026-04-01",
      "quarter",
      [
        { day: "2026-03-31", grossCents: 118 },
        { day: "2026-04-01", grossCents: 236 },
      ],
      FAR_FUTURE,
    );

    assert.deepEqual(
      rows.map((row) => [row.key, row.from, row.to, row.grossCents]),
      [
        ["2026-Q1", "2026-01-01", "2026-03-31", 118],
        ["2026-Q2", "2026-04-01", "2026-06-30", 236],
      ],
    );
  });

  it("keeps the total gross equal to the in-range daily gross", () => {
    const daily = [
      { day: "2026-11-30", grossCents: 500 },
      { day: "2026-12-01", grossCents: 700 },
      { day: "2027-01-15", grossCents: 900 },
    ];
    const rows = bucketTaxByPeriod(
      "2026-11-01",
      "2027-01-31",
      "month",
      daily,
      FAR_FUTURE,
    );

    assert.equal(
      rows.reduce((sum, row) => sum + row.grossCents, 0),
      daily.reduce((sum, row) => sum + row.grossCents, 0),
    );
  });

  it("drops days outside the range", () => {
    const [row] = bucketTaxByPeriod(
      "2026-08-10",
      "2026-08-20",
      "month",
      [
        { day: "2026-08-09", grossCents: 1_000 },
        { day: "2026-08-10", grossCents: 118 },
        { day: "2026-08-21", grossCents: 1_000 },
      ],
      FAR_FUTURE,
    );

    assert.equal(row?.grossCents, 118);
  });

  it("returns zeros for a range without sales", () => {
    assert.deepEqual(
      bucketTaxByPeriod("2026-08-01", "2026-08-31", "month", [], FAR_FUTURE),
      [
        {
          key: "2026-08",
          label: "Agosto de 2026",
          from: "2026-08-01",
          to: "2026-08-31",
          partial: false,
          grossCents: 0,
          netCents: 0,
          taxCents: 0,
        },
      ] satisfies TaxPeriodRow[],
    );
  });

  it("marks as partial a period cut by the range on either end", () => {
    const rows = bucketTaxByPeriod(
      "2026-07-15",
      "2026-09-10",
      "month",
      [],
      FAR_FUTURE,
    );

    assert.deepEqual(
      rows.map((row) => [row.key, row.partial]),
      [
        ["2026-07", true],
        ["2026-08", false],
        ["2026-09", true],
      ],
    );
  });

  it("marks as partial a quarter cut by a one-day range", () => {
    const [row] = bucketTaxByPeriod(
      "2026-05-05",
      "2026-05-05",
      "quarter",
      [],
      FAR_FUTURE,
    );

    assert.equal(row?.partial, true);
  });

  it("marks as partial the current month even when the range covers it whole", () => {
    const rows = bucketTaxByPeriod(
      "2026-08-01",
      "2026-09-30",
      "month",
      [],
      "2026-09-23",
    );

    assert.deepEqual(
      rows.map((row) => [row.key, row.partial]),
      [
        ["2026-08", false],
        ["2026-09", true],
      ],
    );
  });

  it("keeps a period open on its own last day and closes it the day after", () => {
    const onLastDay = bucketTaxByPeriod(
      "2026-09-01",
      "2026-09-30",
      "month",
      [],
      "2026-09-30",
    );
    const dayAfter = bucketTaxByPeriod(
      "2026-09-01",
      "2026-09-30",
      "month",
      [],
      "2026-10-01",
    );

    assert.equal(onLastDay[0]?.partial, true);
    assert.equal(dayAfter[0]?.partial, false);
  });

  it("marks the default range (first of the month to today) as partial", () => {
    const rows = bucketTaxByPeriod(
      "2026-09-01",
      "2026-09-23",
      "month",
      [{ day: "2026-09-23", grossCents: 118 }],
      "2026-09-23",
    );

    assert.equal(rows.length, 1);
    assert.equal(rows[0]?.partial, true);
  });

  it("marks as partial a quarter that still contains today", () => {
    const rows = bucketTaxByPeriod(
      "2026-04-01",
      "2026-09-30",
      "quarter",
      [],
      "2026-09-23",
    );

    assert.deepEqual(
      rows.map((row) => [row.key, row.partial]),
      [
        ["2026-Q2", false],
        ["2026-Q3", true],
      ],
    );
  });
});
