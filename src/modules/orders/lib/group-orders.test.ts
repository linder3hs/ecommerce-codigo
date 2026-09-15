// Pruebas unitarias de src/modules/orders/lib/group-orders.ts
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { OrderSummary } from "@/modules/checkout/types/order";

import { groupOrdersByDay } from "./group-orders";

function makeOrder(overrides: Partial<OrderSummary> = {}): OrderSummary {
  return {
    id: "ord_1",
    status: "paid",
    totalCents: 10_000,
    currency: "pen",
    createdAt: "2026-09-09T18:00:00.000Z",
    items: [
      {
        id: "itm_1",
        productId: "prd_1",
        nameSnapshot: "Teclado mecánico",
        unitPriceCents: 10_000,
        qty: 1,
      },
    ],
    ...overrides,
  };
}

function ids(orders: OrderSummary[]): string[] {
  return orders.map((order) => order.id);
}

describe("groupOrdersByDay", () => {
  it("returns no groups for an empty list", () => {
    assert.deepEqual(groupOrdersByDay([]), []);
  });

  it("builds one group out of a single order", () => {
    const order = makeOrder({ createdAt: "2026-09-09T18:00:00.000Z", totalCents: 25_990 });

    assert.deepEqual(groupOrdersByDay([order]), [
      { date: "2026-09-09", totalCents: 25_990, orders: [order] },
    ]);
  });

  it("groups by the store civil day, not by the UTC one", () => {
    // 23:00 UTC son las 18:00 del 9 en Lima; 04:00 UTC del 10 son las 23:00
    // del 9 en Lima. UTC las separaría en dos días; la tienda no.
    const evening = makeOrder({ id: "ord_evening", createdAt: "2026-09-09T23:00:00.000Z" });
    const lateNight = makeOrder({ id: "ord_late", createdAt: "2026-09-10T04:00:00.000Z" });

    const groups = groupOrdersByDay([evening, lateNight]);

    assert.equal(groups.length, 1);
    assert.equal(groups[0].date, "2026-09-09");
    assert.deepEqual(ids(groups[0].orders), ["ord_late", "ord_evening"]);
  });

  it("splits two orders that straddle store midnight into different days", () => {
    const before = makeOrder({ id: "ord_before", createdAt: "2026-09-10T04:59:59.999Z" });
    const after = makeOrder({ id: "ord_after", createdAt: "2026-09-10T05:00:00.000Z" });

    const groups = groupOrdersByDay([before, after]);

    assert.deepEqual(
      groups.map((group) => [group.date, ids(group.orders)]),
      [
        ["2026-09-10", ["ord_after"]],
        ["2026-09-09", ["ord_before"]],
      ],
    );
  });

  it("keeps an order made at UTC midnight in the previous store day", () => {
    const groups = groupOrdersByDay([makeOrder({ createdAt: "2026-09-10T00:00:00.000Z" })]);

    assert.equal(groups[0].date, "2026-09-09");
  });

  it("sums the totals of every order in the group as integers", () => {
    const groups = groupOrdersByDay([
      makeOrder({ id: "a", createdAt: "2026-09-09T14:00:00.000Z", totalCents: 1 }),
      makeOrder({ id: "b", createdAt: "2026-09-09T15:00:00.000Z", totalCents: 25_990 }),
      makeOrder({ id: "c", createdAt: "2026-09-09T16:00:00.000Z", totalCents: 74_010 }),
    ]);

    assert.equal(groups.length, 1);
    assert.equal(groups[0].totalCents, 100_001);
    assert.ok(Number.isInteger(groups[0].totalCents));
  });

  it("sums each day separately, never across days", () => {
    const groups = groupOrdersByDay([
      makeOrder({ id: "a", createdAt: "2026-09-09T14:00:00.000Z", totalCents: 1_000 }),
      makeOrder({ id: "b", createdAt: "2026-09-10T14:00:00.000Z", totalCents: 2_000 }),
      makeOrder({ id: "c", createdAt: "2026-09-10T16:00:00.000Z", totalCents: 500 }),
    ]);

    assert.deepEqual(
      groups.map((group) => [group.date, group.totalCents]),
      [
        ["2026-09-10", 2_500],
        ["2026-09-09", 1_000],
      ],
    );
  });

  it("sorts the groups from the most to the least recent day", () => {
    const groups = groupOrdersByDay([
      makeOrder({ id: "old", createdAt: "2026-09-01T14:00:00.000Z" }),
      makeOrder({ id: "new", createdAt: "2026-09-20T14:00:00.000Z" }),
      makeOrder({ id: "mid", createdAt: "2026-09-10T14:00:00.000Z" }),
    ]);

    assert.deepEqual(
      groups.map((group) => group.date),
      ["2026-09-20", "2026-09-10", "2026-09-01"],
    );
  });

  it("sorts groups across month and year boundaries as calendar days, not as text length", () => {
    const groups = groupOrdersByDay([
      makeOrder({ id: "dec", createdAt: "2026-12-31T14:00:00.000Z" }),
      makeOrder({ id: "jan", createdAt: "2027-01-02T14:00:00.000Z" }),
      makeOrder({ id: "nov", createdAt: "2026-11-30T14:00:00.000Z" }),
    ]);

    assert.deepEqual(
      groups.map((group) => group.date),
      ["2027-01-02", "2026-12-31", "2026-11-30"],
    );
  });

  it("sorts the orders inside a group from the most to the least recent instant", () => {
    const groups = groupOrdersByDay([
      makeOrder({ id: "morning", createdAt: "2026-09-09T13:00:00.000Z" }),
      makeOrder({ id: "night", createdAt: "2026-09-09T23:59:00.000Z" }),
      makeOrder({ id: "noon", createdAt: "2026-09-09T18:00:00.000Z" }),
    ]);

    assert.deepEqual(ids(groups[0].orders), ["night", "noon", "morning"]);
  });

  it("keeps the input order for orders sharing the exact same instant", () => {
    const groups = groupOrdersByDay([
      makeOrder({ id: "first", createdAt: "2026-09-09T18:00:00.000Z" }),
      makeOrder({ id: "second", createdAt: "2026-09-09T18:00:00.000Z" }),
    ]);

    assert.deepEqual(ids(groups[0].orders), ["first", "second"]);
  });

  it("produces the same result no matter the order of the input", () => {
    const orders = [
      makeOrder({ id: "a", createdAt: "2026-09-09T13:00:00.000Z", totalCents: 100 }),
      makeOrder({ id: "b", createdAt: "2026-09-10T13:00:00.000Z", totalCents: 200 }),
      makeOrder({ id: "c", createdAt: "2026-09-09T23:00:00.000Z", totalCents: 300 }),
    ];

    const straight = groupOrdersByDay(orders);
    const reversed = groupOrdersByDay([...orders].reverse());

    assert.deepEqual(reversed, straight);
  });

  it("does not mutate the received array nor its orders", () => {
    const orders = [
      makeOrder({ id: "a", createdAt: "2026-09-10T13:00:00.000Z", totalCents: 100 }),
      makeOrder({ id: "b", createdAt: "2026-09-09T13:00:00.000Z", totalCents: 200 }),
    ];
    const snapshot = structuredClone(orders);

    groupOrdersByDay(orders);

    assert.deepEqual(orders, snapshot);
    assert.deepEqual(ids(orders), ["a", "b"]);
  });

  it("puts the very same order objects in the groups, without copying them", () => {
    const order = makeOrder();
    const groups = groupOrdersByDay([order]);

    assert.equal(groups[0].orders[0], order);
  });

  it("reads the civil day from any ISO offset the API may send", () => {
    const groups = groupOrdersByDay([
      makeOrder({ id: "utc", createdAt: "2026-09-10T04:00:00.000Z" }),
      makeOrder({ id: "offset", createdAt: "2026-09-09T20:00:00-05:00" }),
    ]);

    assert.equal(groups.length, 1);
    assert.equal(groups[0].date, "2026-09-09");
  });

  it("keeps every order: the flattened groups have the same count as the input", () => {
    const orders = [
      makeOrder({ id: "a", createdAt: "2026-09-09T13:00:00.000Z" }),
      makeOrder({ id: "b", createdAt: "2026-09-09T14:00:00.000Z" }),
      makeOrder({ id: "c", createdAt: "2026-09-10T14:00:00.000Z" }),
      makeOrder({ id: "d", createdAt: "2026-10-01T02:00:00.000Z" }),
    ];

    const groups = groupOrdersByDay(orders);

    assert.equal(
      groups.reduce((count, group) => count + group.orders.length, 0),
      orders.length,
    );
    assert.deepEqual(
      groups.map((group) => group.date),
      ["2026-09-30", "2026-09-10", "2026-09-09"],
    );
  });
});
