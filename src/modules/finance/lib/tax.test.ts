// Pruebas unitarias de src/modules/finance/lib/tax.ts
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { IGV_PERCENT, netFromGrossCents, taxFromGrossCents } from "./tax";

describe("IGV_PERCENT", () => {
  it("is the Peruvian 18 % already included in store prices", () => {
    assert.equal(IGV_PERCENT, 18);
  });
});

describe("netFromGrossCents", () => {
  it("returns 0 for a gross of 0", () => {
    assert.equal(netFromGrossCents(0), 0);
  });

  it("rounds a single cent up to a net of 1", () => {
    assert.equal(netFromGrossCents(1), 1);
  });

  it("returns an exact 50 for a gross of 59", () => {
    assert.equal(netFromGrossCents(59), 50);
  });

  it("rounds 84.74… to 85 for a gross of 100", () => {
    assert.equal(netFromGrossCents(100), 85);
  });

  it("returns 100 for a gross of 118 (AC3)", () => {
    assert.equal(netFromGrossCents(118), 100);
  });
});

describe("taxFromGrossCents", () => {
  it("returns 18 for a gross of 118 (AC3)", () => {
    assert.equal(taxFromGrossCents(118), 18);
  });

  it("returns 0 for a gross of 0", () => {
    assert.equal(taxFromGrossCents(0), 0);
  });

  it("is always gross − net, so net + tax adds back to the gross", () => {
    for (const gross of [0, 1, 2, 3, 59, 100, 118, 999, 25_990, 1_234_567]) {
      const net = netFromGrossCents(gross);
      const tax = taxFromGrossCents(gross);

      assert.equal(tax, gross - net, `gross ${gross}`);
      assert.equal(net + tax, gross, `gross ${gross}`);
    }
  });
});
