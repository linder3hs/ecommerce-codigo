// Pruebas unitarias de src/modules/finance/schemas/expense.schema.ts
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  createExpenseSchema,
  expenseFormSchema,
  expenseQuerySchema,
  updateExpenseSchema,
} from "./expense.schema";

const VALID_EXPENSE = {
  category: "marketing",
  amountCents: 129990,
  expenseDate: "2026-09-01",
  description: null,
} as const;

const VALID_FORM = {
  category: "marketing",
  amount: "1299.90",
  expenseDate: "2026-09-01",
  description: null,
} as const;

describe("expenseQuerySchema", () => {
  it("defaults to the first page with no filters", () => {
    assert.deepEqual(expenseQuerySchema.parse({}), { page: 1, pageSize: 10 });
  });

  it("coerces the pagination and keeps category and range", () => {
    assert.deepEqual(
      expenseQuerySchema.parse({
        page: "2",
        pageSize: "20",
        category: "payroll",
        dateFrom: "2026-09-01",
        dateTo: "2026-09-30",
      }),
      {
        page: 2,
        pageSize: 20,
        category: "payroll",
        dateFrom: "2026-09-01",
        dateTo: "2026-09-30",
      },
    );
  });

  it("accepts a single end of the range", () => {
    assert.equal(
      expenseQuerySchema.safeParse({ dateFrom: "2026-09-01" }).success,
      true,
    );
    assert.equal(
      expenseQuerySchema.safeParse({ dateTo: "2026-09-30" }).success,
      true,
    );
  });

  it("accepts a single-day range", () => {
    assert.equal(
      expenseQuerySchema.safeParse({
        dateFrom: "2026-09-09",
        dateTo: "2026-09-09",
      }).success,
      true,
    );
  });

  it("rejects dateFrom after dateTo, reporting it on dateTo (AC2)", () => {
    const result = expenseQuerySchema.safeParse({
      dateFrom: "2026-09-10",
      dateTo: "2026-09-09",
    });

    assert.equal(result.success, false);
    assert.deepEqual(result.error?.issues[0]?.path, ["dateTo"]);
  });

  it("rejects a category outside the enum", () => {
    assert.equal(
      expenseQuerySchema.safeParse({ category: "inventory" }).success,
      false,
    );
  });

  it("rejects a date that is not a calendar day", () => {
    assert.equal(
      expenseQuerySchema.safeParse({ dateFrom: "2026-02-30" }).success,
      false,
    );
  });
});

describe("createExpenseSchema", () => {
  it("accepts a valid expense", () => {
    assert.deepEqual(createExpenseSchema.parse(VALID_EXPENSE), VALID_EXPENSE);
  });

  it("rejects an amount of 0 cents (AC6)", () => {
    assert.equal(
      createExpenseSchema.safeParse({ ...VALID_EXPENSE, amountCents: 0 })
        .success,
      false,
    );
  });

  it("rejects a negative amount (AC6)", () => {
    assert.equal(
      createExpenseSchema.safeParse({ ...VALID_EXPENSE, amountCents: -100 })
        .success,
      false,
    );
  });

  it("rejects a non-integer amount of cents (AC6)", () => {
    assert.equal(
      createExpenseSchema.safeParse({ ...VALID_EXPENSE, amountCents: 12.5 })
        .success,
      false,
    );
  });

  it("accepts 1 cent as the minimum amount", () => {
    assert.equal(
      createExpenseSchema.safeParse({ ...VALID_EXPENSE, amountCents: 1 })
        .success,
      true,
    );
  });

  it("drops a createdBy sent in the body: the author comes from the session (AC3)", () => {
    const parsed = createExpenseSchema.parse({
      ...VALID_EXPENSE,
      createdBy: "00000000-0000-0000-0000-000000000000",
    });

    assert.equal("createdBy" in parsed, false);
  });

  it("trims the description and rejects a blank one", () => {
    assert.equal(
      createExpenseSchema.parse({ ...VALID_EXPENSE, description: "  Ads  " })
        .description,
      "Ads",
    );
    assert.equal(
      createExpenseSchema.safeParse({ ...VALID_EXPENSE, description: "   " })
        .success,
      false,
    );
  });

  it("requires the description key, with null as the empty value", () => {
    assert.equal(
      createExpenseSchema.safeParse({
        category: VALID_EXPENSE.category,
        amountCents: VALID_EXPENSE.amountCents,
        expenseDate: VALID_EXPENSE.expenseDate,
      }).success,
      false,
    );
  });
});

describe("updateExpenseSchema", () => {
  it("rejects an empty body", () => {
    assert.equal(updateExpenseSchema.safeParse({}).success, false);
  });

  it("accepts description: null to clear it", () => {
    assert.deepEqual(updateExpenseSchema.parse({ description: null }), {
      description: null,
    });
  });

  it("accepts a single field and keeps the amount rules (AC6)", () => {
    assert.deepEqual(updateExpenseSchema.parse({ amountCents: 500 }), {
      amountCents: 500,
    });
    assert.equal(
      updateExpenseSchema.safeParse({ amountCents: 0 }).success,
      false,
    );
  });
});

describe("expenseFormSchema.amount", () => {
  it("converts soles to integer cents", () => {
    assert.equal(expenseFormSchema.parse(VALID_FORM).amount, 129990);
    assert.equal(
      expenseFormSchema.parse({ ...VALID_FORM, amount: "12,5" }).amount,
      1250,
    );
  });

  for (const amount of ["0", "0.00", "-5", "1.999", "abc", ""]) {
    it(`rejects "${amount}" (AC6)`, () => {
      assert.equal(
        expenseFormSchema.safeParse({ ...VALID_FORM, amount }).success,
        false,
      );
    });
  }

  it("rejects the form without a chosen category", () => {
    assert.equal(
      expenseFormSchema.safeParse({ ...VALID_FORM, category: undefined })
        .success,
      false,
    );
  });
});
