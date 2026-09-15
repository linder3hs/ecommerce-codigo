// Pruebas unitarias de src/modules/storefront/lib/landing.ts
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { PublicProduct } from "@/modules/products/types/public-product";

import {
  discountLabel,
  discountPercent,
  formatCountdown,
  isOffer,
  isSoldOut,
  productSpec,
  secondsUntil,
  selectHeroSlides,
  selectOffers,
  selectSpotlight,
  selectThumbs,
  selectWide,
  stockNote,
} from "./landing";

// Datos reales de entrada, no una pieza falsa: los selectores son funciones
// sobre filas ya cargadas y esta fábrica solo arma una fila válida.
function makeProduct(overrides: Partial<PublicProduct> = {}): PublicProduct {
  return {
    id: "p-1",
    name: "Producto",
    slug: "producto",
    description: "Descripción larga del producto",
    priceCents: 100000,
    compareAtPriceCents: null,
    stock: 5,
    imageUrl: null,
    category: { id: "c-1", name: "Laptops", slug: "laptops" },
    ...overrides,
  };
}

describe("isOffer", () => {
  it("is true when the compare-at price is above the current price", () => {
    assert.equal(
      isOffer(makeProduct({ priceCents: 80000, compareAtPriceCents: 100000 })),
      true,
    );
  });

  it("is false when there is no compare-at price", () => {
    assert.equal(isOffer(makeProduct({ compareAtPriceCents: null })), false);
  });

  it("is false when the compare-at price equals the current price", () => {
    assert.equal(
      isOffer(makeProduct({ priceCents: 100000, compareAtPriceCents: 100000 })),
      false,
    );
  });

  it("is false when the compare-at price is below the current price", () => {
    assert.equal(
      isOffer(makeProduct({ priceCents: 100000, compareAtPriceCents: 90000 })),
      false,
    );
  });

  it("is false when the compare-at price is zero", () => {
    assert.equal(
      isOffer(makeProduct({ priceCents: 0, compareAtPriceCents: 0 })),
      false,
    );
  });

  it("is true for a one-cent difference", () => {
    assert.equal(
      isOffer(makeProduct({ priceCents: 99999, compareAtPriceCents: 100000 })),
      true,
    );
  });
});

describe("isSoldOut", () => {
  it("is true when stock is zero", () => {
    assert.equal(isSoldOut(makeProduct({ stock: 0 })), true);
  });

  it("is true when stock is negative", () => {
    assert.equal(isSoldOut(makeProduct({ stock: -3 })), true);
  });

  it("is false for the last unit in stock", () => {
    assert.equal(isSoldOut(makeProduct({ stock: 1 })), false);
  });
});

describe("discountPercent", () => {
  it("returns null when there is no compare-at price", () => {
    assert.equal(discountPercent(makeProduct({ compareAtPriceCents: null })), null);
  });

  it("returns null when the compare-at price equals the current price", () => {
    assert.equal(
      discountPercent(
        makeProduct({ priceCents: 100000, compareAtPriceCents: 100000 }),
      ),
      null,
    );
  });

  it("returns null when the compare-at price is below the current price", () => {
    assert.equal(
      discountPercent(
        makeProduct({ priceCents: 100000, compareAtPriceCents: 60000 }),
      ),
      null,
    );
  });

  it("computes an exact percentage", () => {
    assert.equal(
      discountPercent(
        makeProduct({ priceCents: 80000, compareAtPriceCents: 100000 }),
      ),
      20,
    );
  });

  it("rounds down when the fraction is below half a point", () => {
    // 33,33 % → 33
    assert.equal(
      discountPercent(
        makeProduct({ priceCents: 66670, compareAtPriceCents: 100000 }),
      ),
      33,
    );
  });

  it("rounds up when the fraction is exactly half a point", () => {
    // 33,5 % → 34
    assert.equal(
      discountPercent(
        makeProduct({ priceCents: 66500, compareAtPriceCents: 100000 }),
      ),
      34,
    );
  });

  it("returns 100 for a free product with a compare-at price", () => {
    assert.equal(
      discountPercent(makeProduct({ priceCents: 0, compareAtPriceCents: 100000 })),
      100,
    );
  });

  it("returns a whole number, never a decimal", () => {
    const percent = discountPercent(
      makeProduct({ priceCents: 12345, compareAtPriceCents: 99999 }),
    );

    assert.equal(Number.isInteger(percent), true);
  });

  it("matches round(diff/compare) over a sweep of integer cent prices", () => {
    for (let compare = 1000; compare <= 500000; compare += 7919) {
      for (let price = 0; price < compare; price += 997) {
        const expected = Math.round(((compare - price) * 100) / compare);

        assert.equal(
          discountPercent(
            makeProduct({ priceCents: price, compareAtPriceCents: compare }),
          ),
          expected,
          `price ${price} vs compare ${compare}`,
        );
      }
    }
  });
});

describe("discountLabel", () => {
  it("formats the percentage with a leading minus and a spaced percent sign", () => {
    assert.equal(
      discountLabel(makeProduct({ priceCents: 75000, compareAtPriceCents: 100000 })),
      "-25 %",
    );
  });

  it("returns null when the product is not on offer", () => {
    assert.equal(discountLabel(makeProduct({ compareAtPriceCents: null })), null);
  });

  it("returns null when the compare-at price does not beat the current one", () => {
    assert.equal(
      discountLabel(
        makeProduct({ priceCents: 100000, compareAtPriceCents: 100000 }),
      ),
      null,
    );
  });
});

describe("stockNote", () => {
  it("reads 'Agotado' when there are no units left", () => {
    assert.equal(stockNote(makeProduct({ stock: 0 })), "Agotado");
  });

  it("reads 'Agotado' for a negative stock", () => {
    assert.equal(stockNote(makeProduct({ stock: -2 })), "Agotado");
  });

  it("reports the remaining units when there is stock", () => {
    assert.equal(stockNote(makeProduct({ stock: 12 })), "12 en stock");
  });

  it("reports the last unit without any special casing", () => {
    assert.equal(stockNote(makeProduct({ stock: 1 })), "1 en stock");
  });
});

describe("productSpec", () => {
  it("uses the product description when it has content", () => {
    assert.equal(
      productSpec(makeProduct({ description: "16 GB RAM · 512 GB SSD" })),
      "16 GB RAM · 512 GB SSD",
    );
  });

  it("trims the surrounding whitespace of the description", () => {
    assert.equal(
      productSpec(makeProduct({ description: "  Pantalla OLED  " })),
      "Pantalla OLED",
    );
  });

  it("falls back to the category name when the description is null", () => {
    assert.equal(productSpec(makeProduct({ description: null })), "Laptops");
  });

  it("falls back to the category name when the description is an empty string", () => {
    assert.equal(productSpec(makeProduct({ description: "" })), "Laptops");
  });

  it("falls back to the category name when the description is only whitespace", () => {
    assert.equal(productSpec(makeProduct({ description: "   \n\t " })), "Laptops");
  });
});

describe("selectOffers", () => {
  it("keeps only the products on offer, in their original order", () => {
    const a = makeProduct({ id: "a", priceCents: 80000, compareAtPriceCents: 100000 });
    const b = makeProduct({ id: "b", compareAtPriceCents: null });
    const c = makeProduct({ id: "c", priceCents: 50000, compareAtPriceCents: 60000 });

    assert.deepEqual(
      selectOffers([a, b, c]).map((product) => product.id),
      ["a", "c"],
    );
  });

  it("returns an empty list when nothing is on offer", () => {
    assert.deepEqual(selectOffers([makeProduct(), makeProduct({ id: "b" })]), []);
  });

  it("returns an empty list for an empty catalog", () => {
    assert.deepEqual(selectOffers([]), []);
  });

  it("does not mutate the list it receives", () => {
    const products = [
      makeProduct({ id: "a", priceCents: 80000, compareAtPriceCents: 100000 }),
      makeProduct({ id: "b" }),
    ];

    selectOffers(products);

    assert.deepEqual(
      products.map((product) => product.id),
      ["a", "b"],
    );
  });
});

describe("selectHeroSlides", () => {
  it("uses every offer when there is at least one", () => {
    const products = [
      makeProduct({ id: "a" }),
      makeProduct({ id: "b", priceCents: 80000, compareAtPriceCents: 100000 }),
      makeProduct({ id: "c", priceCents: 10000, compareAtPriceCents: 20000 }),
    ];

    assert.deepEqual(
      selectHeroSlides(products).map((product) => product.id),
      ["b", "c"],
    );
  });

  it("falls back to the first 4 products when nothing is on offer", () => {
    const products = ["a", "b", "c", "d", "e", "f"].map((id) =>
      makeProduct({ id }),
    );

    assert.deepEqual(
      selectHeroSlides(products).map((product) => product.id),
      ["a", "b", "c", "d"],
    );
  });

  it("returns every product when there are fewer than 4 and none is on offer", () => {
    const products = [makeProduct({ id: "a" }), makeProduct({ id: "b" })];

    assert.deepEqual(
      selectHeroSlides(products).map((product) => product.id),
      ["a", "b"],
    );
  });

  it("returns an empty list for an empty catalog", () => {
    assert.deepEqual(selectHeroSlides([]), []);
  });

  it("keeps more than 4 slides when there are more than 4 offers", () => {
    const products = ["a", "b", "c", "d", "e"].map((id) =>
      makeProduct({ id, priceCents: 80000, compareAtPriceCents: 100000 }),
    );

    assert.equal(selectHeroSlides(products).length, 5);
  });
});

describe("selectSpotlight", () => {
  it("returns null for an empty catalog", () => {
    assert.equal(selectSpotlight([]), null);
  });

  it("returns the most expensive product that is not on offer", () => {
    const products = [
      makeProduct({ id: "cheap", priceCents: 50000 }),
      makeProduct({
        id: "expensive-offer",
        priceCents: 900000,
        compareAtPriceCents: 1200000,
      }),
      makeProduct({ id: "pricey", priceCents: 300000 }),
    ];

    assert.equal(selectSpotlight(products)?.id, "pricey");
  });

  it("falls back to the most expensive product when the whole catalog is on offer", () => {
    const products = [
      makeProduct({ id: "a", priceCents: 50000, compareAtPriceCents: 60000 }),
      makeProduct({ id: "b", priceCents: 700000, compareAtPriceCents: 800000 }),
      makeProduct({ id: "c", priceCents: 90000, compareAtPriceCents: 95000 }),
    ];

    assert.equal(selectSpotlight(products)?.id, "b");
  });

  it("keeps the first product when two share the highest price", () => {
    const products = [
      makeProduct({ id: "first", priceCents: 400000 }),
      makeProduct({ id: "second", priceCents: 400000 }),
    ];

    assert.equal(selectSpotlight(products)?.id, "first");
  });

  it("returns the only product of a single-item catalog even if it is on offer", () => {
    const products = [
      makeProduct({ id: "solo", priceCents: 1000, compareAtPriceCents: 2000 }),
    ];

    assert.equal(selectSpotlight(products)?.id, "solo");
  });
});

describe("selectWide", () => {
  it("returns null for an empty catalog", () => {
    assert.equal(selectWide([]), null);
  });

  it("returns the offer with the biggest discount", () => {
    const products = [
      makeProduct({ id: "no-offer", priceCents: 999000 }),
      makeProduct({ id: "off-10", priceCents: 90000, compareAtPriceCents: 100000 }),
      makeProduct({ id: "off-50", priceCents: 50000, compareAtPriceCents: 100000 }),
      makeProduct({ id: "off-25", priceCents: 75000, compareAtPriceCents: 100000 }),
    ];

    assert.equal(selectWide(products)?.id, "off-50");
  });

  it("keeps the first offer when two share the same discount", () => {
    const products = [
      makeProduct({ id: "first", priceCents: 80000, compareAtPriceCents: 100000 }),
      makeProduct({ id: "second", priceCents: 40000, compareAtPriceCents: 50000 }),
    ];

    assert.equal(selectWide(products)?.id, "first");
  });

  it("ignores the products that are not on offer when at least one offer exists", () => {
    const products = [
      makeProduct({ id: "plain", priceCents: 999000 }),
      makeProduct({ id: "only-offer", priceCents: 95000, compareAtPriceCents: 100000 }),
    ];

    assert.equal(selectWide(products)?.id, "only-offer");
  });

  it("returns the only product of a single-item catalog with no offers", () => {
    const products = [makeProduct({ id: "solo", priceCents: 1000 })];

    assert.equal(selectWide(products)?.id, "solo");
  });

  // BLOQUEO (hallazgo, no se testea hasta que lo decida una persona): el
  // contrato documentado del fallback sin ofertas es "el más caro", pero la
  // implementación compara `discountPercent(...) ?? 0`, que vale 0 para todos,
  // así que `reduce` se queda con el PRIMER producto de la lista — el más
  // reciente, no el más caro. Asertar "el más caro" deja el test en rojo;
  // asertar "el primero" sería bajar el estándar al comportamiento actual.
  // Desbloqueo: decidir si se corrige `selectWide` o su documentación.
  it.todo(
    "falls back to the most expensive product when there are no offers (documented contract; implementation returns the first one)",
  );
});

describe("selectThumbs", () => {
  it("drops the products already used by other sections", () => {
    const products = ["a", "b", "c", "d"].map((id) => makeProduct({ id }));

    assert.deepEqual(
      selectThumbs(products, [products[1]]).map((product) => product.id),
      ["a", "c", "d"],
    );
  });

  it("caps the result at 3 products", () => {
    const products = ["a", "b", "c", "d", "e"].map((id) => makeProduct({ id }));

    assert.deepEqual(
      selectThumbs(products, []).map((product) => product.id),
      ["a", "b", "c"],
    );
  });

  it("ignores the null entries of the exclusion list", () => {
    const products = ["a", "b", "c"].map((id) => makeProduct({ id }));

    assert.deepEqual(
      selectThumbs(products, [null, null]).map((product) => product.id),
      ["a", "b", "c"],
    );
  });

  it("excludes by id, not by object identity", () => {
    const products = ["a", "b", "c", "d"].map((id) => makeProduct({ id }));

    assert.deepEqual(
      selectThumbs(products, [makeProduct({ id: "a" })]).map(
        (product) => product.id,
      ),
      ["b", "c", "d"],
    );
  });

  it("returns an empty list when every product is excluded", () => {
    const products = ["a", "b"].map((id) => makeProduct({ id }));

    assert.deepEqual(selectThumbs(products, products), []);
  });

  it("returns an empty list for an empty catalog", () => {
    assert.deepEqual(selectThumbs([], [null]), []);
  });

  it("tolerates excluded products that are not in the list", () => {
    const products = ["a", "b"].map((id) => makeProduct({ id }));

    assert.deepEqual(
      selectThumbs(products, [makeProduct({ id: "z" })]).map(
        (product) => product.id,
      ),
      ["a", "b"],
    );
  });
});

describe("formatCountdown", () => {
  it("pads every field to two digits at zero", () => {
    assert.equal(formatCountdown(0), "00:00:00");
  });

  it("formats hours, minutes and seconds", () => {
    assert.equal(formatCountdown(3661), "01:01:01");
  });

  it("formats the last second before an hour rolls over", () => {
    assert.equal(formatCountdown(3599), "00:59:59");
  });

  it("formats the biggest 2-digit hour value", () => {
    assert.equal(formatCountdown(86399), "23:59:59");
  });

  it("lets the hours grow past 24 instead of wrapping around a day", () => {
    assert.equal(formatCountdown(90000), "25:00:00");
  });

  it("saturates at zero for a negative amount of seconds", () => {
    assert.equal(formatCountdown(-1), "00:00:00");
  });

  it("saturates at zero for a negative fraction of a second", () => {
    assert.equal(formatCountdown(-0.5), "00:00:00");
  });

  it("truncates fractional seconds instead of rounding them up", () => {
    assert.equal(formatCountdown(59.9), "00:00:59");
  });

  it("formats the offers window constant used by the landing", () => {
    assert.equal(formatCountdown(8079), "02:14:39");
  });
});

describe("secondsUntil", () => {
  it("returns the whole seconds left until the deadline", () => {
    assert.equal(secondsUntil(1_000_000, 990_000), 10);
  });

  it("truncates the leftover milliseconds instead of rounding them up", () => {
    assert.equal(secondsUntil(1_000_000, 991_500), 8);
  });

  it("returns zero when now is exactly the deadline", () => {
    assert.equal(secondsUntil(1_000_000, 1_000_000), 0);
  });

  it("returns zero once the deadline is in the past", () => {
    assert.equal(secondsUntil(1_000_000, 1_500_000), 0);
  });

  it("returns zero for a deadline less than a second away", () => {
    assert.equal(secondsUntil(1_000_000, 999_500), 0);
  });

  it("works with real epoch milliseconds", () => {
    const now = Date.now();

    assert.equal(secondsUntil(now + 8079 * 1000, now), 8079);
  });
});
