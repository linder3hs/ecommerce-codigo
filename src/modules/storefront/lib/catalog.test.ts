// Pruebas unitarias de src/modules/storefront/lib/catalog.ts
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { CatalogState } from "./catalog";

import {
  CATALOG_PAGE_SIZE,
  CATALOG_PATH,
  EMPTY_CATALOG_STATE,
  hasActiveFilters,
  parseCatalogParams,
  productHref,
  toCatalogHref,
  toCatalogQuery,
  toCatalogQueryString,
} from "./catalog";

function makeState(overrides: Partial<CatalogState> = {}): CatalogState {
  return { ...EMPTY_CATALOG_STATE, ...overrides };
}

describe("productHref", () => {
  it("hangs the slug off the catalog path", () => {
    assert.equal(productHref("laptop-gamer-15"), "/products/laptop-gamer-15");
  });

  it("uses the same base path the catalog exports", () => {
    assert.equal(
      productHref("mouse-inalambrico"),
      `${CATALOG_PATH}/mouse-inalambrico`,
    );
  });

  it("does not touch the slug it receives", () => {
    assert.equal(productHref("SSD-1TB"), "/products/SSD-1TB");
  });
});

describe("parseCatalogParams", () => {
  it("returns the empty state when there is no search param at all", () => {
    assert.deepEqual(
      parseCatalogParams(new URLSearchParams()),
      EMPTY_CATALOG_STATE,
    );
  });

  it("reads every param of a fully-specified URL", () => {
    const params = new URLSearchParams(
      "q=teclado&category=perifericos&price=500-1500&stock=1&deals=1&sort=price-asc&page=3",
    );

    assert.deepEqual(parseCatalogParams(params), {
      q: "teclado",
      category: "perifericos",
      price: "500-1500",
      stock: true,
      deals: true,
      sort: "price-asc",
      page: 3,
    });
  });

  it("trims the surrounding whitespace of the search text", () => {
    const params = new URLSearchParams();
    params.set("q", "  laptop  ");

    assert.equal(parseCatalogParams(params).q, "laptop");
  });

  it("keeps an empty search text as an empty string, never as null", () => {
    const params = new URLSearchParams("q=");

    assert.equal(parseCatalogParams(params).q, "");
  });

  it("drops an unknown price range instead of keeping the raw value", () => {
    const params = new URLSearchParams("price=lt1");

    assert.equal(parseCatalogParams(params).price, null);
  });

  it("falls back to the default sort when the sort id is unknown", () => {
    const params = new URLSearchParams("sort=cheapest-first");

    assert.equal(parseCatalogParams(params).sort, "newest");
  });

  it("accepts every sort id the catalog offers", () => {
    for (const sort of ["newest", "price-asc", "price-desc", "discount"]) {
      assert.equal(
        parseCatalogParams(new URLSearchParams(`sort=${sort}`)).sort,
        sort,
      );
    }
  });

  it("accepts every price range id the catalog offers", () => {
    for (const price of ["lt500", "500-1500", "1500-4000", "gt4000"]) {
      assert.equal(
        parseCatalogParams(new URLSearchParams(`price=${price}`)).price,
        price,
      );
    }
  });

  it("treats only the literal '1' as an active boolean flag", () => {
    const truthy = parseCatalogParams(new URLSearchParams("stock=1&deals=1"));
    const other = parseCatalogParams(
      new URLSearchParams("stock=true&deals=yes"),
    );

    assert.deepEqual([truthy.stock, truthy.deals], [true, true]);
    assert.deepEqual([other.stock, other.deals], [false, false]);
  });

  it("falls back to page 1 for a zero, negative, decimal or non-numeric page", () => {
    for (const page of ["0", "-4", "2.5", "abc", ""]) {
      assert.equal(
        parseCatalogParams(new URLSearchParams(`page=${page}`)).page,
        1,
        `page=${page}`,
      );
    }
  });

  it("keeps a valid page number", () => {
    assert.equal(parseCatalogParams(new URLSearchParams("page=7")).page, 7);
  });

  it("returns the category slug untouched, without a default", () => {
    assert.equal(
      parseCatalogParams(new URLSearchParams("category=audio-y-video")).category,
      "audio-y-video",
    );
  });

  it("accepts any object that can only read params, not just URLSearchParams", () => {
    const params = { get: (key: string) => (key === "q" ? "monitor" : null) };

    assert.deepEqual(parseCatalogParams(params), makeState({ q: "monitor" }));
  });
});

describe("toCatalogQueryString", () => {
  it("writes nothing for the empty state", () => {
    assert.equal(toCatalogQueryString(EMPTY_CATALOG_STATE), "");
  });

  it("writes every non-default value in a stable order", () => {
    const state = makeState({
      q: "laptop",
      category: "laptops",
      price: "1500-4000",
      stock: true,
      deals: true,
      sort: "price-desc",
      page: 4,
    });

    assert.equal(
      toCatalogQueryString(state),
      "q=laptop&category=laptops&price=1500-4000&stock=1&deals=1&sort=price-desc&page=4",
    );
  });

  it("omits the default sort", () => {
    assert.equal(toCatalogQueryString(makeState({ sort: "newest" })), "");
  });

  it("omits the first page but writes any later one", () => {
    assert.equal(toCatalogQueryString(makeState({ page: 1 })), "");
    assert.equal(toCatalogQueryString(makeState({ page: 2 })), "page=2");
  });

  it("omits the boolean filters when they are off", () => {
    assert.equal(
      toCatalogQueryString(makeState({ stock: false, deals: false })),
      "",
    );
  });

  it("encodes a search text with spaces and symbols", () => {
    assert.equal(
      toCatalogQueryString(makeState({ q: "audio & video" })),
      "q=audio+%26+video",
    );
  });

  it("round-trips with parseCatalogParams", () => {
    const state = makeState({
      q: "teclado mecánico",
      category: "perifericos",
      price: "gt4000",
      stock: true,
      deals: true,
      sort: "discount",
      page: 9,
    });

    assert.deepEqual(
      parseCatalogParams(new URLSearchParams(toCatalogQueryString(state))),
      state,
    );
  });
});

describe("toCatalogHref", () => {
  it("returns the bare catalog path when there is nothing to write", () => {
    assert.equal(toCatalogHref(EMPTY_CATALOG_STATE), "/products");
  });

  it("joins the path and the query string with a single question mark", () => {
    assert.equal(
      toCatalogHref(makeState({ category: "laptops", page: 2 })),
      "/products?category=laptops&page=2",
    );
  });

  it("does not leave a trailing question mark when only defaults changed", () => {
    assert.equal(toCatalogHref(makeState({ sort: "newest", page: 1 })), "/products");
  });
});

describe("toCatalogQuery", () => {
  it("sends only paging and sorting when no filter is active", () => {
    assert.deepEqual(toCatalogQuery(EMPTY_CATALOG_STATE), {
      page: 1,
      pageSize: CATALOG_PAGE_SIZE,
      sortBy: "createdAt",
      sortDir: "desc",
    });
  });

  it("maps the search text to the API's `search` parameter", () => {
    assert.equal(toCatalogQuery(makeState({ q: "monitor" })).search, "monitor");
  });

  it("omits `search` entirely when the text is empty", () => {
    assert.equal("search" in toCatalogQuery(makeState({ q: "" })), false);
  });

  it("maps the category to `categorySlug`", () => {
    assert.equal(
      toCatalogQuery(makeState({ category: "laptops" })).categorySlug,
      "laptops",
    );
  });

  it("omits `categorySlug` when there is no category", () => {
    assert.equal("categorySlug" in toCatalogQuery(EMPTY_CATALOG_STATE), false);
  });

  it("turns a bounded price range into both cent limits", () => {
    const query = toCatalogQuery(makeState({ price: "lt500" }));

    assert.equal(query.minPriceCents, 0);
    assert.equal(query.maxPriceCents, 50000);
  });

  it("sends only the lower limit for the open-ended price range", () => {
    const query = toCatalogQuery(makeState({ price: "gt4000" }));

    assert.equal(query.minPriceCents, 400000);
    assert.equal("maxPriceCents" in query, false);
  });

  it("keeps the price limits in integer cents", () => {
    const query = toCatalogQuery(makeState({ price: "1500-4000" }));

    assert.equal(Number.isInteger(query.minPriceCents), true);
    assert.equal(Number.isInteger(query.maxPriceCents), true);
  });

  it("maps the stock filter to `inStock`", () => {
    assert.equal(toCatalogQuery(makeState({ stock: true })).inStock, true);
    assert.equal("inStock" in toCatalogQuery(makeState({ stock: false })), false);
  });

  it("maps the deals filter to `onlyOffers`", () => {
    assert.equal(toCatalogQuery(makeState({ deals: true })).onlyOffers, true);
    assert.equal("onlyOffers" in toCatalogQuery(makeState({ deals: false })), false);
  });

  it("translates every sort id into its API field and direction", () => {
    assert.deepEqual(
      (["newest", "price-asc", "price-desc", "discount"] as const).map((sort) => {
        const query = toCatalogQuery(makeState({ sort }));

        return [query.sortBy, query.sortDir];
      }),
      [
        ["createdAt", "desc"],
        ["priceCents", "asc"],
        ["priceCents", "desc"],
        ["discount", "desc"],
      ],
    );
  });

  it("falls back to the default sort when the state carries an unknown one", () => {
    // Un `?sort=` inventado ya cae en el default al parsear; esto cubre el
    // estado armado a mano, que es el otro camino de entrada.
    const query = toCatalogQuery({
      ...EMPTY_CATALOG_STATE,
      sort: "unknown" as CatalogState["sort"],
    });

    assert.equal(query.sortBy, "createdAt");
    assert.equal(query.sortDir, "desc");
  });

  it("forwards the page and always asks for the catalog page size", () => {
    const query = toCatalogQuery(makeState({ page: 5 }));

    assert.equal(query.page, 5);
    assert.equal(query.pageSize, 12);
  });

  it("sends every filter at once when the whole state is set", () => {
    const query = toCatalogQuery(
      makeState({
        q: "gamer",
        category: "laptops",
        price: "500-1500",
        stock: true,
        deals: true,
        sort: "price-asc",
        page: 2,
      }),
    );

    assert.deepEqual(query, {
      page: 2,
      pageSize: CATALOG_PAGE_SIZE,
      sortBy: "priceCents",
      sortDir: "asc",
      search: "gamer",
      categorySlug: "laptops",
      minPriceCents: 50000,
      maxPriceCents: 150000,
      inStock: true,
      onlyOffers: true,
    });
  });
});

describe("hasActiveFilters", () => {
  it("is false for the empty state", () => {
    assert.equal(hasActiveFilters(EMPTY_CATALOG_STATE), false);
  });

  it("is true when there is a search text", () => {
    assert.equal(hasActiveFilters(makeState({ q: "ssd" })), true);
  });

  it("is true when a category is selected", () => {
    assert.equal(hasActiveFilters(makeState({ category: "laptops" })), true);
  });

  it("is true when a price range is selected", () => {
    assert.equal(hasActiveFilters(makeState({ price: "lt500" })), true);
  });

  it("is true when the stock filter is on", () => {
    assert.equal(hasActiveFilters(makeState({ stock: true })), true);
  });

  it("is true when the deals filter is on", () => {
    assert.equal(hasActiveFilters(makeState({ deals: true })), true);
  });

  it("ignores the sort: changing it alone does not count as filtering", () => {
    assert.equal(hasActiveFilters(makeState({ sort: "discount" })), false);
  });

  it("ignores the page: paging alone does not count as filtering", () => {
    assert.equal(hasActiveFilters(makeState({ page: 6 })), false);
  });

  it("agrees with the URL: a state that writes no filter param has no active filter", () => {
    const state = makeState({ sort: "price-desc", page: 3 });

    assert.equal(hasActiveFilters(state), false);
    assert.equal(toCatalogQueryString(state), "sort=price-desc&page=3");
  });
});
