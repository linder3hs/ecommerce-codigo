// Pruebas unitarias de src/modules/finance/schemas/revenue.schema.ts
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { revenueQuerySchema } from "./revenue.schema";
import { MAX_RANGE_DAYS } from "@/modules/orders/lib/date-range";

describe("revenueQuerySchema", () => {
  it("accepts no dates and defaults the breakdown to product", () => {
    assert.deepEqual(revenueQuerySchema.parse({}), { breakdown: "product" });
  });

  it("accepts a full range with a category breakdown", () => {
    assert.deepEqual(
      revenueQuerySchema.parse({
        from: "2026-09-01",
        to: "2026-09-30",
        breakdown: "category",
      }),
      { from: "2026-09-01", to: "2026-09-30", breakdown: "category" },
    );
  });

  it("accepts a single-day range", () => {
    assert.equal(
      revenueQuerySchema.safeParse({ from: "2026-09-09", to: "2026-09-09" })
        .success,
      true,
    );
  });

  it("rejects a range with only one end (AC7)", () => {
    assert.equal(
      revenueQuerySchema.safeParse({ from: "2026-09-01" }).success,
      false,
    );
    assert.equal(
      revenueQuerySchema.safeParse({ to: "2026-09-30" }).success,
      false,
    );
  });

  it("rejects from after to (AC7)", () => {
    assert.equal(
      revenueQuerySchema.safeParse({ from: "2026-09-10", to: "2026-09-09" })
        .success,
      false,
    );
  });

  it(`accepts exactly ${MAX_RANGE_DAYS} days and rejects one more (AC7)`, () => {
    assert.equal(
      revenueQuerySchema.safeParse({ from: "2028-01-01", to: "2028-12-31" })
        .success,
      true,
    );
    assert.equal(
      revenueQuerySchema.safeParse({ from: "2027-12-31", to: "2028-12-31" })
        .success,
      false,
    );
  });

  it("rejects a date that is not YYYY-MM-DD", () => {
    assert.equal(
      revenueQuerySchema.safeParse({ from: "01/09/2026", to: "2026-09-30" })
        .success,
      false,
    );
  });

  it("rejects an unknown breakdown", () => {
    assert.equal(
      revenueQuerySchema.safeParse({ breakdown: "customer" }).success,
      false,
    );
  });
});
