// Pruebas unitarias de src/modules/payment-methods/schemas/payment-method.schema.ts
//
// El import de `PaymentMethodRow` es `import type`: se borra en compilación, así
// que el repositorio con `server-only` nunca se carga bajo el runner.
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { z } from "zod";

import {
  paymentMethodIdSchema,
  toPaymentMethod,
} from "./payment-method.schema";

import type { PaymentMethodRow } from "@/server/repositories/payment-method.repository";

const ID = "3f2504e0-4f89-41d3-9a0c-0305e82c3301";

const baseRow: PaymentMethodRow = {
  id: ID,
  userId: "9f8e7d6c-5b4a-4938-8271-615243cba099",
  stripePaymentMethodId: "pm_1QaBcDeFgHiJkLmN",
  brand: "visa",
  last4: "4242",
  expMonth: 3,
  expYear: 2029,
  isDefault: true,
  createdAt: new Date("2026-01-15T10:00:00.000Z"),
  updatedAt: new Date("2026-02-20T11:30:00.000Z"),
};

function rowWithout(key: keyof PaymentMethodRow): PaymentMethodRow {
  const copy: Record<string, unknown> = { ...baseRow };

  delete copy[key];

  return copy as unknown as PaymentMethodRow;
}

describe("toPaymentMethod", () => {
  it("projects a row into the six public fields of a PaymentMethod", () => {
    assert.deepEqual(toPaymentMethod(baseRow), {
      id: ID,
      brand: "visa",
      last4: "4242",
      expMonth: 3,
      expYear: 2029,
      isDefault: true,
    });
  });

  it("returns exactly those six keys and nothing else", () => {
    assert.deepEqual(Object.keys(toPaymentMethod(baseRow)).sort(), [
      "brand",
      "expMonth",
      "expYear",
      "id",
      "isDefault",
      "last4",
    ]);
  });

  it("drops the Stripe payment method reference, so no pm_… ever reaches the browser", () => {
    const projected = toPaymentMethod(baseRow);

    assert.equal("stripePaymentMethodId" in projected, false);
    assert.equal(JSON.stringify(projected).includes("pm_"), false);
  });

  it("drops the owner id and the internal timestamps", () => {
    const projected = toPaymentMethod(baseRow);

    assert.equal("userId" in projected, false);
    assert.equal("createdAt" in projected, false);
    assert.equal("updatedAt" in projected, false);
  });

  it("drops a stripeCustomerId that a careless caller spread into the row", () => {
    // El caso que motiva esta función: alguien mezcla la fila del usuario con
    // la de la tarjeta y la devuelve entera. Zod recorta lo que no declara.
    const contaminated = {
      ...baseRow,
      stripeCustomerId: "cus_NffrFeUfNV2Hib",
    };

    const projected = toPaymentMethod(contaminated);

    assert.equal("stripeCustomerId" in projected, false);
    assert.equal(JSON.stringify(projected).includes("cus_"), false);
  });

  it("drops any unknown extra field, not just the ones known today", () => {
    const contaminated = {
      ...baseRow,
      clerkId: "user_2abcDEF",
      email: "cliente@example.com",
      fingerprint: "Xt5EWLLDS7FJjR1c",
    };

    const projected = toPaymentMethod(contaminated);

    assert.deepEqual(Object.keys(projected).sort(), [
      "brand",
      "expMonth",
      "expYear",
      "id",
      "isDefault",
      "last4",
    ]);
  });

  it("returns a new object instead of aliasing the row it was given", () => {
    const projected = toPaymentMethod(baseRow);

    assert.equal(Object.is(projected, baseRow), false);
  });

  it("does not mutate the row it was given", () => {
    const row = { ...baseRow };

    toPaymentMethod(row);

    assert.deepEqual(row, baseRow);
  });

  it("keeps isDefault false as false instead of dropping the falsy value", () => {
    const projected = toPaymentMethod({ ...baseRow, isDefault: false });

    assert.equal("isDefault" in projected, true);
    assert.equal(projected.isDefault, false);
  });

  it("keeps the leading zeros of last4, which travels as a string", () => {
    assert.equal(toPaymentMethod({ ...baseRow, last4: "0007" }).last4, "0007");
  });

  it("keeps an empty brand as is: the display layer decides how to render it", () => {
    assert.equal(toPaymentMethod({ ...baseRow, brand: "" }).brand, "");
  });

  it("throws when the id is not a uuid", () => {
    assert.throws(() => toPaymentMethod({ ...baseRow, id: "42" }), z.ZodError);
  });

  it("throws when a public field is missing from the row", () => {
    assert.throws(() => toPaymentMethod(rowWithout("brand")), z.ZodError);
    assert.throws(() => toPaymentMethod(rowWithout("last4")), z.ZodError);
    assert.throws(() => toPaymentMethod(rowWithout("isDefault")), z.ZodError);
  });

  it("throws instead of coercing a numeric last4 into a string", () => {
    const wrongType = { ...baseRow, last4: 4242 } as unknown as PaymentMethodRow;

    assert.throws(() => toPaymentMethod(wrongType), z.ZodError);
  });

  it("throws when the expiry month is not an integer", () => {
    assert.throws(
      () => toPaymentMethod({ ...baseRow, expMonth: 3.5 }),
      z.ZodError,
    );
  });

  it("does not range-check the expiry month: that guard lives in the table", () => {
    assert.equal(toPaymentMethod({ ...baseRow, expMonth: 99 }).expMonth, 99);
  });
});

describe("paymentMethodIdSchema", () => {
  it("accepts a uuid", () => {
    assert.equal(paymentMethodIdSchema.safeParse(ID).success, true);
  });

  it("accepts an uppercase uuid, the same value Postgres normalizes on the way in", () => {
    assert.equal(
      paymentMethodIdSchema.safeParse(ID.toUpperCase()).success,
      true,
    );
  });

  it("rejects a non-uuid string with the message the API shows", () => {
    const result = paymentMethodIdSchema.safeParse("not-a-card");

    assert.equal(result.success, false);
    assert.equal(
      result.error?.issues[0]?.message,
      "La tarjeta indicada no es válida.",
    );
  });

  it("rejects an empty id", () => {
    assert.equal(paymentMethodIdSchema.safeParse("").success, false);
  });

  it("rejects a uuid with the wrong shape, so a truncated route param never reaches the repository", () => {
    assert.equal(
      paymentMethodIdSchema.safeParse(ID.slice(0, -1)).success,
      false,
    );
    assert.equal(paymentMethodIdSchema.safeParse(`${ID} `).success, false);
  });

  it("rejects a value that is not a string at all", () => {
    assert.equal(paymentMethodIdSchema.safeParse(42).success, false);
    assert.equal(paymentMethodIdSchema.safeParse(null).success, false);
    assert.equal(paymentMethodIdSchema.safeParse(undefined).success, false);
  });
});
