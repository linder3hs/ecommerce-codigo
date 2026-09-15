// Pruebas unitarias de src/modules/storefront/lib/search-target.ts
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { PublicProduct } from "@/modules/products/types/public-product";

import { resolveSearchHref } from "./search-target";

// Datos reales de entrada, no una pieza falsa: `resolveSearchHref` solo lee
// `name` y `slug`, el resto completa la forma que exige el tipo.
function makeProduct(overrides: Partial<PublicProduct> = {}): PublicProduct {
  return {
    id: "11111111-1111-1111-1111-111111111111",
    name: "Teclado Mecánico",
    slug: "teclado-mecanico",
    description: "Switches lineales",
    priceCents: 45000,
    compareAtPriceCents: null,
    stock: 7,
    imageUrl: null,
    category: { id: "aaaa", name: "Periféricos", slug: "perifericos" },
    ...overrides,
  };
}

describe("resolveSearchHref", () => {
  it("goes to the product detail when the panel returned a single result, even if the text does not match", () => {
    const product = makeProduct();

    assert.equal(resolveSearchHref("tecl", product, 1), "/products/teclado-mecanico");
  });

  it("goes to the product detail when the text matches the product name exactly, despite several results", () => {
    const product = makeProduct();

    assert.equal(
      resolveSearchHref("Teclado Mecánico", product, 5),
      "/products/teclado-mecanico",
    );
  });

  it("matches the name ignoring case, accents and repeated whitespace", () => {
    const product = makeProduct();

    assert.equal(
      resolveSearchHref("  teclado   MECANICO ", product, 9),
      "/products/teclado-mecanico",
    );
  });

  it("matches a product whose own name carries the accents and extra spaces", () => {
    const product = makeProduct({ name: " Audífonos  ÓVER ear ", slug: "audifonos-over-ear" });

    assert.equal(
      resolveSearchHref("audifonos over ear", product, 4),
      "/products/audifonos-over-ear",
    );
  });

  it("goes to the filtered catalog when there are several results and no exact name match", () => {
    const product = makeProduct();

    assert.equal(resolveSearchHref("teclado", product, 3), "/products?q=teclado");
  });

  it("percent-encodes the query it forwards to the catalog", () => {
    const product = makeProduct();

    assert.equal(
      resolveSearchHref("teclado inalámbrico & mouse", product, 6),
      "/products?q=teclado%20inal%C3%A1mbrico%20%26%20mouse",
    );
  });

  it("trims the query before putting it in the catalog URL, but does not collapse inner spaces", () => {
    const product = makeProduct();

    assert.equal(
      resolveSearchHref("   gamer  pro   ", product, 8),
      "/products?q=gamer%20%20pro",
    );
  });

  it("goes to the catalog with an empty q when the query is blank and there is more than one result", () => {
    const product = makeProduct();

    assert.equal(resolveSearchHref("   ", product, 2), "/products?q=");
  });

  it("goes to the product detail when a blank query faces a product with a blank name", () => {
    const product = makeProduct({ name: "   ", slug: "sin-nombre" });

    assert.equal(resolveSearchHref("", product, 4), "/products/sin-nombre");
  });

  it("goes to the catalog when the result count is zero and the text does not match", () => {
    const product = makeProduct();

    assert.equal(resolveSearchHref("mouse", product, 0), "/products?q=mouse");
  });

  it("does not treat a partial prefix of the name as a match", () => {
    const product = makeProduct();

    assert.equal(
      resolveSearchHref("teclado meca", product, 2),
      "/products?q=teclado%20meca",
    );
  });
});
