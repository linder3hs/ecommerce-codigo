// Pruebas unitarias de src/modules/orders/lib/date-range.ts
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  currentMonthRange,
  formatDayLabel,
  HISTORY_LOOKBACK_DAYS,
  isRangeValid,
  lastDaysRange,
  MAX_RANGE_DAYS,
  rangeDays,
  rangeToInstants,
  STORE_UTC_OFFSET,
  toStoreDay,
  todayInStore,
} from "./date-range";

const DAY_MS = 24 * 60 * 60 * 1000;

// Las funciones de reloj no se congelan (prohibido mockear `Date`): se
// contrastan contra la ventana de días civiles observada justo antes y justo
// después de la llamada. En el borde de medianoche de la tienda el valor
// legítimo puede ser cualquiera de los dos, y esta ventana lo admite sin
// volver la prueba intermitente.
function dayWindow<T>(call: () => T): { value: T; days: Set<string> } {
  const before = toStoreDay(new Date());
  const value = call();
  const after = toStoreDay(new Date());

  return { value, days: new Set([before, after]) };
}

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

describe("STORE_UTC_OFFSET", () => {
  it("is the fixed Lima offset, the same one rangeToInstants parses", () => {
    assert.equal(STORE_UTC_OFFSET, "-05:00");
    assert.equal(
      new Date(`2026-09-09T00:00:00${STORE_UTC_OFFSET}`).toISOString(),
      "2026-09-09T05:00:00.000Z",
    );
  });
});

describe("toStoreDay", () => {
  it("keeps the UTC day for an instant that is the same civil day in both zones", () => {
    assert.equal(toStoreDay(new Date("2026-09-09T12:00:00.000Z")), "2026-09-09");
  });

  it("returns the previous civil day for an instant that is already tomorrow in UTC", () => {
    // 04:00 UTC son las 23:00 del día anterior en Lima.
    assert.equal(toStoreDay(new Date("2026-09-10T04:00:00.000Z")), "2026-09-09");
  });

  it("keeps the same civil day for an evening instant that has not crossed UTC midnight", () => {
    // 23:00 UTC son las 18:00 del mismo día en Lima.
    assert.equal(toStoreDay(new Date("2026-09-09T23:00:00.000Z")), "2026-09-09");
  });

  it("treats UTC midnight as still belonging to the previous store day", () => {
    assert.equal(toStoreDay(new Date("2026-09-10T00:00:00.000Z")), "2026-09-09");
  });

  it("returns the last millisecond before store midnight as the previous day", () => {
    assert.equal(toStoreDay(new Date("2026-09-10T04:59:59.999Z")), "2026-09-09");
  });

  it("starts the new store day exactly at 05:00 UTC", () => {
    assert.equal(toStoreDay(new Date("2026-09-10T05:00:00.000Z")), "2026-09-10");
  });

  it("rolls back to the previous month across the month boundary", () => {
    assert.equal(toStoreDay(new Date("2026-10-01T02:00:00.000Z")), "2026-09-30");
  });

  it("rolls back to the previous year across the year boundary", () => {
    assert.equal(toStoreDay(new Date("2027-01-01T03:00:00.000Z")), "2026-12-31");
  });

  it("rolls back onto February 29th of a leap year", () => {
    assert.equal(toStoreDay(new Date("2028-03-01T04:30:00.000Z")), "2028-02-29");
  });

  it("handles pre-epoch instants, where the shift is negative arithmetic", () => {
    assert.equal(toStoreDay(new Date("1969-12-31T04:00:00.000Z")), "1969-12-30");
  });

  it("reads the same civil day from any ISO representation of one instant", () => {
    assert.equal(
      toStoreDay(new Date("2026-09-09T18:00:00-05:00")),
      toStoreDay(new Date("2026-09-09T23:00:00.000Z")),
    );
  });
});

describe("todayInStore", () => {
  it("returns a YYYY-MM-DD civil day", () => {
    assert.match(todayInStore(), ISO_DAY);
  });

  it("returns the store day of the instant the call happened", () => {
    const { value, days } = dayWindow(todayInStore);

    assert.ok(days.has(value), `${value} fuera de {${[...days].join(", ")}}`);
  });

  it("never returns a day after the current UTC day, because the offset is negative", () => {
    const today = todayInStore();
    const utcDay = new Date().toISOString().slice(0, 10);

    assert.ok(today <= utcDay, `${today} > ${utcDay}`);
  });

  it("is the identity used by toStoreDay, not a second date implementation", () => {
    const { value, days } = dayWindow(() => toStoreDay(new Date()));

    assert.ok(days.has(value));
  });
});

describe("currentMonthRange", () => {
  it("ends on today in the store calendar", () => {
    const { value, days } = dayWindow(currentMonthRange);

    assert.ok(days.has(value.to), `${value.to} fuera de la ventana de hoy`);
  });

  it("starts on the first day of the month of its end date", () => {
    const { from, to } = currentMonthRange();

    assert.equal(from, `${to.slice(0, 7)}-01`);
    assert.ok(from.endsWith("-01"));
  });

  it("keeps both ends inside the same year and month", () => {
    const { from, to } = currentMonthRange();

    assert.equal(from.slice(0, 7), to.slice(0, 7));
  });

  it("is never inverted, not even on the first day of the month", () => {
    const { from, to } = currentMonthRange();

    assert.ok(from <= to);
  });

  it("produces a range the API would accept", () => {
    const { from, to } = currentMonthRange();

    assert.equal(isRangeValid(from, to), true);
  });

  it("spans as many days as the day number of its end date", () => {
    const { from, to } = currentMonthRange();

    assert.equal(rangeDays(from, to), Number(to.slice(8, 10)));
  });
});

describe("lastDaysRange", () => {
  it("ends on today in the store calendar", () => {
    const { value, days } = dayWindow(() => lastDaysRange(7));

    assert.ok(days.has(value.to), `${value.to} fuera de la ventana de hoy`);
  });

  it("collapses to a single day for 1", () => {
    const { from, to } = lastDaysRange(1);

    assert.equal(from, to);
    assert.equal(rangeDays(from, to), 1);
  });

  it("spans exactly N days, counting today as one of them", () => {
    for (const days of [2, 7, 30, 90, 365]) {
      const { from, to } = lastDaysRange(days);

      assert.equal(rangeDays(from, to), days, `fallo con days=${days}`);
    }
  });

  it("returns well formed civil days even when the window crosses months and years", () => {
    const { from, to } = lastDaysRange(365);

    assert.match(from, ISO_DAY);
    assert.match(to, ISO_DAY);
    assert.ok(from < to);
  });

  it("keeps the 12 month CTA window inside the API limit", () => {
    const { from, to } = lastDaysRange(HISTORY_LOOKBACK_DAYS);

    assert.ok(HISTORY_LOOKBACK_DAYS < MAX_RANGE_DAYS);
    assert.equal(isRangeValid(from, to), true);
  });

  it("is still valid exactly at MAX_RANGE_DAYS", () => {
    const { from, to } = lastDaysRange(MAX_RANGE_DAYS);

    assert.equal(rangeDays(from, to), MAX_RANGE_DAYS);
    assert.equal(isRangeValid(from, to), true);
  });

  it("crosses the limit one day past MAX_RANGE_DAYS", () => {
    const { from, to } = lastDaysRange(MAX_RANGE_DAYS + 1);

    assert.equal(rangeDays(from, to), MAX_RANGE_DAYS + 1);
    assert.equal(isRangeValid(from, to), false);
  });

  it("returns an inverted range for 0, which isRangeValid rejects", () => {
    // Comportamiento real del `(days - 1)`: con 0 el inicio cae un día después
    // del fin. Hoy inalcanzable desde la UI (solo se llama con
    // HISTORY_LOOKBACK_DAYS), se documenta para que un cambio lo delate.
    const { from, to } = lastDaysRange(0);

    assert.ok(from > to);
    assert.equal(rangeDays(from, to), 0);
    assert.equal(isRangeValid(from, to), false);
  });
});

describe("rangeToInstants", () => {
  it("starts at store midnight of the from day", () => {
    const { fromInstant } = rangeToInstants("2026-09-09", "2026-09-09");

    assert.equal(fromInstant.toISOString(), "2026-09-09T05:00:00.000Z");
  });

  it("ends at store midnight of the day after the to day", () => {
    const { toInstant } = rangeToInstants("2026-09-09", "2026-09-09");

    assert.equal(toInstant.toISOString(), "2026-09-10T05:00:00.000Z");
  });

  it("spans exactly 24 hours for a single day range", () => {
    const { fromInstant, toInstant } = rangeToInstants("2026-09-09", "2026-09-09");

    assert.equal(toInstant.getTime() - fromInstant.getTime(), DAY_MS);
  });

  it("spans one day per calendar day of the range", () => {
    const { fromInstant, toInstant } = rangeToInstants("2026-09-01", "2026-09-30");

    assert.equal(
      toInstant.getTime() - fromInstant.getTime(),
      rangeDays("2026-09-01", "2026-09-30") * DAY_MS,
    );
  });

  it("includes the last millisecond of the to day, the interval being half-open", () => {
    const { toInstant } = rangeToInstants("2026-09-09", "2026-09-09");
    const lastMoment = new Date("2026-09-10T04:59:59.999Z");

    assert.ok(lastMoment.getTime() < toInstant.getTime());
    assert.equal(toStoreDay(lastMoment), "2026-09-09");
  });

  it("excludes the first instant of the day after the to day", () => {
    const { toInstant } = rangeToInstants("2026-09-09", "2026-09-09");
    const nextDayStart = new Date("2026-09-10T05:00:00.000Z");

    assert.equal(nextDayStart.getTime(), toInstant.getTime());
    assert.equal(toStoreDay(nextDayStart), "2026-09-10");
  });

  it("round-trips through toStoreDay on both ends", () => {
    const { fromInstant, toInstant } = rangeToInstants("2026-09-09", "2026-09-30");

    assert.equal(toStoreDay(fromInstant), "2026-09-09");
    assert.equal(toStoreDay(new Date(toInstant.getTime() - 1)), "2026-09-30");
  });

  it("rolls the high end into the next month when to is the last day of the month", () => {
    const { toInstant } = rangeToInstants("2026-09-01", "2026-09-30");

    assert.equal(toInstant.toISOString(), "2026-10-01T05:00:00.000Z");
  });

  it("rolls the high end into the next year when to is December 31st", () => {
    const { toInstant } = rangeToInstants("2026-12-01", "2026-12-31");

    assert.equal(toInstant.toISOString(), "2027-01-01T05:00:00.000Z");
  });

  it("lands on February 29th when the next day is a leap day", () => {
    const { toInstant } = rangeToInstants("2028-02-01", "2028-02-28");

    assert.equal(toInstant.toISOString(), "2028-02-29T05:00:00.000Z");
  });

  it("does not validate the range: an inverted one yields toInstant before fromInstant", () => {
    const { fromInstant, toInstant } = rangeToInstants("2026-09-10", "2026-09-01");

    assert.ok(toInstant.getTime() < fromInstant.getTime());
  });
});

describe("rangeDays", () => {
  it("counts a single day range as 1", () => {
    assert.equal(rangeDays("2026-09-09", "2026-09-09"), 1);
  });

  it("counts two consecutive days as 2, both ends included", () => {
    assert.equal(rangeDays("2026-09-09", "2026-09-10"), 2);
  });

  it("counts across a month boundary", () => {
    assert.equal(rangeDays("2026-01-31", "2026-02-01"), 2);
  });

  it("counts the 29 days of February in a leap year", () => {
    assert.equal(rangeDays("2028-02-01", "2028-03-01"), 30);
  });

  it("counts the 28 days of February in a common year", () => {
    assert.equal(rangeDays("2027-02-01", "2027-03-01"), 29);
  });

  it("counts a full common year as 365 days", () => {
    assert.equal(rangeDays("2026-01-01", "2026-12-31"), 365);
  });

  it("counts a full leap year as 366 days", () => {
    assert.equal(rangeDays("2028-01-01", "2028-12-31"), 366);
  });

  it("is unaffected by northern DST changes, since the arithmetic is UTC", () => {
    assert.equal(rangeDays("2026-10-24", "2026-11-02"), 10);
  });

  it("returns 0 for a range inverted by one day", () => {
    assert.equal(rangeDays("2026-09-10", "2026-09-09"), 0);
  });

  it("returns a negative count for a range inverted by more than one day", () => {
    assert.equal(rangeDays("2026-09-01", "2026-08-30"), -1);
  });

  it("returns NaN when a bound is not a parsable date", () => {
    assert.ok(Number.isNaN(rangeDays("2026-13-45", "2026-13-46")));
  });
});

describe("isRangeValid", () => {
  it("accepts a single day range", () => {
    assert.equal(isRangeValid("2026-09-09", "2026-09-09"), true);
  });

  it("accepts an ordinary multi-day range", () => {
    assert.equal(isRangeValid("2026-09-01", "2026-09-30"), true);
  });

  it("rejects an empty from", () => {
    assert.equal(isRangeValid("", "2026-09-09"), false);
  });

  it("rejects an empty to", () => {
    assert.equal(isRangeValid("2026-09-09", ""), false);
  });

  it("rejects both ends empty", () => {
    assert.equal(isRangeValid("", ""), false);
  });

  it("rejects an inverted range", () => {
    assert.equal(isRangeValid("2026-09-10", "2026-09-09"), false);
  });

  it("accepts a range exactly at MAX_RANGE_DAYS", () => {
    assert.equal(rangeDays("2026-01-01", "2027-01-01"), MAX_RANGE_DAYS);
    assert.equal(isRangeValid("2026-01-01", "2027-01-01"), true);
  });

  it("rejects a range one day past MAX_RANGE_DAYS", () => {
    assert.equal(rangeDays("2026-01-01", "2027-01-02"), MAX_RANGE_DAYS + 1);
    assert.equal(isRangeValid("2026-01-01", "2027-01-02"), false);
  });

  it("rejects unparsable dates that still sort in the right order", () => {
    assert.equal(isRangeValid("2026-13-45", "2026-13-46"), false);
  });

  it("caps the window at 366 days, matching the schema refine", () => {
    assert.equal(MAX_RANGE_DAYS, 366);
  });
});

describe("formatDayLabel", () => {
  // `es-PE` imprime "setiembre", no "septiembre" como dice el ejemplo del
  // JSDoc del fuente. Se fija el texto real que ve el usuario peruano.
  it("renders a civil day as long-form Peruvian Spanish", () => {
    assert.equal(formatDayLabel("2026-09-09"), "9 de setiembre de 2026");
  });

  it("prints the day without a leading zero", () => {
    assert.equal(formatDayLabel("2026-03-05"), "5 de marzo de 2026");
  });

  it("renders the first day of a month", () => {
    assert.equal(formatDayLabel("2026-08-01"), "1 de agosto de 2026");
  });

  it("renders the last day of a year", () => {
    assert.equal(formatDayLabel("2026-12-31"), "31 de diciembre de 2026");
  });

  it("renders a leap day", () => {
    assert.equal(formatDayLabel("2028-02-29"), "29 de febrero de 2028");
  });

  it("does not shift the day of a store civil day computed from a late UTC instant", () => {
    const day = toStoreDay(new Date("2026-09-10T04:00:00.000Z"));

    assert.equal(formatDayLabel(day), "9 de setiembre de 2026");
  });
});
