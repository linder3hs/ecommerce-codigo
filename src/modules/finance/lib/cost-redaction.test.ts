// Pruebas unitarias de src/modules/finance/lib/cost-redaction.ts
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { redactCost } from "./cost-redaction";

const ROW = {
  id: "11111111-1111-4111-8111-111111111111",
  name: "Teclado mecánico",
  priceCents: 29_990,
  costCents: 18_000,
};

describe("redactCost", () => {
  it("returns the row untouched when the actor can view the cost", () => {
    const result = redactCost(ROW, true);

    assert.deepEqual(result, ROW);
    assert.equal("costCents" in result, true);
  });

  it("removes the key instead of nulling it when the actor cannot view the cost", () => {
    const result = redactCost(ROW, false);

    // La clave no está: `null` significaría "costo desconocido" y este producto
    // sí tiene costo cargado.
    assert.equal("costCents" in result, false);
    assert.deepEqual(result, {
      id: ROW.id,
      name: ROW.name,
      priceCents: ROW.priceCents,
    });
  });

  it("also removes the key when the stored cost is null, so the two cases are indistinguishable from outside", () => {
    const result = redactCost({ ...ROW, costCents: null }, false);

    assert.equal("costCents" in result, false);
  });

  it("keeps an explicit null when the actor can view the cost", () => {
    const result = redactCost({ ...ROW, costCents: null }, true);

    // El `in` no es ceremonia del test: el tipo de retorno es una unión y
    // TypeScript no deja leer la clave sin comprobarla antes. Esa es justamente
    // la obligación que se le impone a quien consume la fila.
    if (!("costCents" in result)) {
      assert.fail("el costo se quitó a quien sí puede verlo");
    }

    assert.equal(result.costCents, null);
  });

  it("keeps a zero cost as zero: it is a known cost, not a missing one", () => {
    const result = redactCost({ ...ROW, costCents: 0 }, true);

    if (!("costCents" in result)) {
      assert.fail("el costo se quitó a quien sí puede verlo");
    }

    assert.equal(result.costCents, 0);
  });

  it("does not mutate the row it receives", () => {
    const row = { ...ROW };

    redactCost(row, false);

    assert.deepEqual(row, ROW);
  });

  it("preserves every other field of a row with more columns", () => {
    const wide = { ...ROW, sku: "TEC-001", stock: 12, isActive: true };

    assert.deepEqual(redactCost(wide, false), {
      id: wide.id,
      name: wide.name,
      priceCents: wide.priceCents,
      sku: wide.sku,
      stock: wide.stock,
      isActive: wide.isActive,
    });
  });
});
