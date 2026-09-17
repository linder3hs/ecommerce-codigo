// Pruebas unitarias de src/modules/dashboard/schemas/dashboard.schema.ts
//
// El import del pgEnum es de valor y no de tipo a propósito: es la única forma
// de comparar la lista runtime con la fuente de verdad de la BD. `schema/order.ts`
// no tiene `server-only` (solo `db/index.ts` y `seed.ts`), así que carga bajo el
// runner sin abrir conexión.
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { ORDER_STATUSES } from "../constants";
import {
  dashboardMetricsSchema,
  lowStockProductSchema,
  ordersByStatusPointSchema,
  salesByDayPointSchema,
} from "./dashboard.schema";
import { orderStatus } from "@/server/db/schema/order";

import type { DashboardMetrics } from "../types/dashboard";

const PRODUCT_ID = "3f2504e0-4f89-41d3-9a0c-0305e82c3301";

const baseMetrics: DashboardMetrics = {
  salesByDay: [
    { day: "2026-09-15", totalCents: 0 },
    { day: "2026-09-16", totalCents: 25_990 },
  ],
  ordersByStatus: [
    { status: "pending", total: 2 },
    { status: "paid", total: 7 },
    { status: "payment_failed", total: 0 },
  ],
  lowStock: [
    { id: PRODUCT_ID, name: "Teclado mecánico", sku: "KB-001", stock: 3 },
  ],
  windowDays: 30,
  lowStockThreshold: 5,
};

describe("ORDER_STATUSES", () => {
  it("mirrors the order_status pgEnum exactly, so a new status in the DB breaks this test and not the chart", () => {
    assert.deepEqual(
      [...ORDER_STATUSES].sort(),
      [...orderStatus.enumValues].sort(),
    );
  });

  it("lists the statuses in order-lifecycle order, which is the order of the bars", () => {
    assert.deepEqual(
      [...ORDER_STATUSES],
      ["pending", "paid", "payment_failed"],
    );
  });
});

describe("salesByDayPointSchema", () => {
  it("accepts a YYYY-MM-DD day with an integer amount in cents", () => {
    const result = salesByDayPointSchema.safeParse({
      day: "2026-09-16",
      totalCents: 25_990,
    });

    assert.equal(result.success, true);
    assert.deepEqual(result.data, { day: "2026-09-16", totalCents: 25_990 });
  });

  it("accepts a day with no sales as zero", () => {
    assert.equal(
      salesByDayPointSchema.safeParse({ day: "2026-09-16", totalCents: 0 })
        .success,
      true,
    );
  });

  it("rejects a timestamp where a civil day is expected: the keys have to merge with the repository's", () => {
    assert.equal(
      salesByDayPointSchema.safeParse({
        day: "2026-09-16T00:00:00.000Z",
        totalCents: 0,
      }).success,
      false,
    );
  });

  it("rejects a day that is not a date at all", () => {
    assert.equal(
      salesByDayPointSchema.safeParse({ day: "16/09/2026", totalCents: 0 })
        .success,
      false,
    );
    assert.equal(
      salesByDayPointSchema.safeParse({ day: "2026-13-01", totalCents: 0 })
        .success,
      false,
    );
    assert.equal(
      salesByDayPointSchema.safeParse({ day: "", totalCents: 0 }).success,
      false,
    );
  });

  it("rejects a fractional amount: prices are integer cents", () => {
    assert.equal(
      salesByDayPointSchema.safeParse({ day: "2026-09-16", totalCents: 259.9 })
        .success,
      false,
    );
  });

  it("rejects the string that Drizzle's sum() returns instead of coercing it", () => {
    // `sum()` devuelve `string | null`: el casteo a número es del repositorio y
    // el contrato no lo tapa.
    assert.equal(
      salesByDayPointSchema.safeParse({
        day: "2026-09-16",
        totalCents: "25990",
      }).success,
      false,
    );
    assert.equal(
      salesByDayPointSchema.safeParse({ day: "2026-09-16", totalCents: null })
        .success,
      false,
    );
  });

  it("drops an extra key instead of letting it through", () => {
    const result = salesByDayPointSchema.safeParse({
      day: "2026-09-16",
      totalCents: 100,
      currency: "pen",
    });

    assert.equal(result.success, true);
    assert.deepEqual(Object.keys(result.data ?? {}).sort(), [
      "day",
      "totalCents",
    ]);
  });
});

describe("ordersByStatusPointSchema", () => {
  it("accepts each status of the enum", () => {
    for (const status of ORDER_STATUSES) {
      assert.equal(
        ordersByStatusPointSchema.safeParse({ status, total: 0 }).success,
        true,
        status,
      );
    }
  });

  it("rejects a status outside the enum", () => {
    assert.equal(
      ordersByStatusPointSchema.safeParse({ status: "refunded", total: 1 })
        .success,
      false,
    );
    assert.equal(
      ordersByStatusPointSchema.safeParse({ status: "PAID", total: 1 }).success,
      false,
    );
  });

  it("rejects a negative or fractional count", () => {
    assert.equal(
      ordersByStatusPointSchema.safeParse({ status: "paid", total: -1 })
        .success,
      false,
    );
    assert.equal(
      ordersByStatusPointSchema.safeParse({ status: "paid", total: 1.5 })
        .success,
      false,
    );
  });
});

describe("lowStockProductSchema", () => {
  it("accepts the four read-only fields the widget shows", () => {
    const result = lowStockProductSchema.safeParse({
      id: PRODUCT_ID,
      name: "Teclado mecánico",
      sku: "KB-001",
      stock: 3,
    });

    assert.equal(result.success, true);
  });

  it("accepts stock zero, which is the most urgent row of the table", () => {
    assert.equal(
      lowStockProductSchema.safeParse({
        id: PRODUCT_ID,
        name: "Mouse",
        sku: "MS-002",
        stock: 0,
      }).success,
      true,
    );
  });

  it("rejects an id that is not a uuid", () => {
    assert.equal(
      lowStockProductSchema.safeParse({
        id: "42",
        name: "Mouse",
        sku: "MS-002",
        stock: 0,
      }).success,
      false,
    );
  });

  it("drops the internal columns of the row if the repository returns them whole", () => {
    const result = lowStockProductSchema.safeParse({
      id: PRODUCT_ID,
      name: "Mouse",
      sku: "MS-002",
      stock: 1,
      priceCents: 9_990,
      isActive: true,
      deletedAt: null,
      categoryId: "8c0f2b3a-1d4e-4f6a-9b8c-7d6e5f4a3b2c",
    });

    assert.equal(result.success, true);
    assert.deepEqual(Object.keys(result.data ?? {}).sort(), [
      "id",
      "name",
      "sku",
      "stock",
    ]);
  });
});

describe("dashboardMetricsSchema", () => {
  it("accepts the full response the handler builds", () => {
    const result = dashboardMetricsSchema.safeParse(baseMetrics);

    assert.equal(result.success, true);
    assert.deepEqual(result.data, baseMetrics);
  });

  it("accepts a brand new store: three series present but empty or zeroed", () => {
    const result = dashboardMetricsSchema.safeParse({
      salesByDay: [],
      ordersByStatus: [],
      lowStock: [],
      windowDays: 30,
      lowStockThreshold: 5,
    });

    assert.equal(result.success, true);
  });

  it("rejects a response with a missing series instead of rendering an empty chart", () => {
    for (const key of ["salesByDay", "ordersByStatus", "lowStock"] as const) {
      const partial: Record<string, unknown> = { ...baseMetrics };

      delete partial[key];

      assert.equal(
        dashboardMetricsSchema.safeParse(partial).success,
        false,
        key,
      );
    }
  });

  it("rejects a series that is not an array", () => {
    assert.equal(
      dashboardMetricsSchema.safeParse({ ...baseMetrics, salesByDay: null })
        .success,
      false,
    );
    assert.equal(
      dashboardMetricsSchema.safeParse({ ...baseMetrics, lowStock: {} })
        .success,
      false,
    );
  });

  it("rejects a response whose window is zero or negative: the label would lie", () => {
    assert.equal(
      dashboardMetricsSchema.safeParse({ ...baseMetrics, windowDays: 0 })
        .success,
      false,
    );
    assert.equal(
      dashboardMetricsSchema.safeParse({ ...baseMetrics, windowDays: -30 })
        .success,
      false,
    );
  });

  it("accepts a zero threshold but rejects a negative one", () => {
    assert.equal(
      dashboardMetricsSchema.safeParse({ ...baseMetrics, lowStockThreshold: 0 })
        .success,
      true,
    );
    assert.equal(
      dashboardMetricsSchema.safeParse({
        ...baseMetrics,
        lowStockThreshold: -1,
      }).success,
      false,
    );
  });

  it("rejects one bad point inside an otherwise valid series", () => {
    const result = dashboardMetricsSchema.safeParse({
      ...baseMetrics,
      salesByDay: [
        { day: "2026-09-15", totalCents: 0 },
        { day: "ayer", totalCents: 100 },
      ],
    });

    assert.equal(result.success, false);
    assert.equal(result.error?.issues[0]?.path.join("."), "salesByDay.1.day");
  });

  it("drops unknown top-level keys", () => {
    const result = dashboardMetricsSchema.safeParse({
      ...baseMetrics,
      revenueMargin: 0.42,
    });

    assert.equal(result.success, true);
    assert.equal("revenueMargin" in (result.data ?? {}), false);
  });

  it("does not mutate the object it parses", () => {
    const input = structuredClone(baseMetrics);

    dashboardMetricsSchema.parse(input);

    assert.deepEqual(input, baseMetrics);
  });
});
