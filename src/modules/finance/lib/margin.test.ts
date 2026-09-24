// Pruebas unitarias de src/modules/finance/lib/margin.ts
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { marginCents, marginPct } from "./margin";

describe("marginCents", () => {
  it("subtracts the cost from the price in cents", () => {
    assert.equal(marginCents(29_990, 18_000), 11_990);
  });

  it("returns null when the cost is unknown, never the full price", () => {
    assert.equal(marginCents(29_990, null), null);
  });

  it("returns a negative margin when the cost exceeds the price (AC3)", () => {
    assert.equal(marginCents(10_000, 12_500), -2_500);
  });

  it("returns the whole price when the cost is a known zero", () => {
    assert.equal(marginCents(29_990, 0), 29_990);
  });

  it("returns 0 when price and cost match", () => {
    assert.equal(marginCents(18_000, 18_000), 0);
  });

  it("computes the absolute margin even when the price is 0 (AC2)", () => {
    assert.equal(marginCents(0, 1_500), -1_500);
  });

  it("stays exact with the largest amount the column admits", () => {
    assert.equal(marginCents(999_999_999, 1), 999_999_998);
  });
});

describe("marginPct", () => {
  it("expresses the margin as a percentage of the price", () => {
    assert.equal(marginPct(20_000, 15_000), 25);
  });

  it("returns null when the cost is unknown, never 100", () => {
    assert.equal(marginPct(29_990, null), null);
  });

  it("returns null when the price is 0, never Infinity (AC2)", () => {
    assert.equal(marginPct(0, 1_500), null);
  });

  it("returns null when both price and cost are 0: there is no ratio to show", () => {
    assert.equal(marginPct(0, 0), null);
  });

  it("returns a negative percentage when the cost exceeds the price (AC3)", () => {
    assert.equal(marginPct(10_000, 12_500), -25);
  });

  it("returns 100 when the known cost is zero", () => {
    assert.equal(marginPct(29_990, 0), 100);
  });

  it("returns 0 when price and cost match", () => {
    assert.equal(marginPct(18_000, 18_000), 0);
  });

  it("keeps the fractional part instead of rounding: it is a display value", () => {
    const pct = marginPct(30_000, 20_000);

    assert.notEqual(pct, null);
    // 33,333…%: el redondeo es decisión de la vista, no de este cálculo.
    assert.ok(Math.abs((pct as number) - 100 / 3) < 1e-9);
  });
});
