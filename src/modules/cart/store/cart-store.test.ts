// Pruebas unitarias de src/modules/cart/store/cart-store.ts
import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";

import type { PublicProduct } from "@/modules/products/types/public-product";

import {
  CART_MAX_QTY,
  lineTotalCents,
  selectCount,
  selectSubtotalCents,
  useCartStore,
} from "./cart-store";

// El store de Zustand es un módulo vivo compartido por todo el archivo de test:
// se restaura su estado inicial real antes de cada caso para que un carrito no
// se filtre al siguiente. No es una pieza falsa, es el store de producción.
function resetStore(): void {
  useCartStore.setState({ items: [], isOpen: false, bumpToken: 0 });
}

function makeProduct(overrides: Partial<PublicProduct> = {}): PublicProduct {
  return {
    id: "prd_teclado",
    name: "Teclado mecánico",
    slug: "teclado-mecanico",
    description: "Switches lineales",
    priceCents: 24990,
    compareAtPriceCents: null,
    stock: 10,
    imageUrl: "https://cdn.test/teclado.webp",
    category: { id: "cat_perifericos", name: "Periféricos", slug: "perifericos" },
    ...overrides,
  };
}

beforeEach(resetStore);

describe("selectCount", () => {
  it("returns 0 for an empty cart", () => {
    assert.equal(selectCount(useCartStore.getState()), 0);
  });

  it("returns the quantity of a single line, not the number of lines", () => {
    useCartStore.getState().add(makeProduct());
    useCartStore.getState().setQty("prd_teclado", 5);

    assert.equal(useCartStore.getState().items.length, 1);
    assert.equal(selectCount(useCartStore.getState()), 5);
  });

  it("sums the quantities of every cart line", () => {
    const { add, setQty } = useCartStore.getState();
    add(makeProduct({ id: "a" }));
    add(makeProduct({ id: "b" }));
    add(makeProduct({ id: "c" }));
    setQty("a", 2);
    setQty("b", 7);

    assert.equal(selectCount(useCartStore.getState()), 2 + 7 + 1);
  });

  it("is not capped by CART_MAX_QTY: the cap applies per line, not to the total", () => {
    const { add, setQty } = useCartStore.getState();
    add(makeProduct({ id: "a" }));
    add(makeProduct({ id: "b" }));
    setQty("a", CART_MAX_QTY);
    setQty("b", CART_MAX_QTY);

    assert.equal(selectCount(useCartStore.getState()), CART_MAX_QTY * 2);
  });

  it("ignores prices entirely: a free product still counts toward the badge", () => {
    useCartStore.getState().add(makeProduct({ id: "gift", priceCents: 0 }));

    assert.equal(selectCount(useCartStore.getState()), 1);
  });
});

describe("selectSubtotalCents", () => {
  it("returns 0 for an empty cart", () => {
    assert.equal(selectSubtotalCents(useCartStore.getState()), 0);
  });

  it("multiplies priceCents by qty for a single line", () => {
    useCartStore.getState().add(makeProduct({ priceCents: 24990 }));
    useCartStore.getState().setQty("prd_teclado", 3);

    assert.equal(selectSubtotalCents(useCartStore.getState()), 74970);
  });

  it("sums priceCents * qty across every line to get the subtotal in cents", () => {
    const { add, setQty } = useCartStore.getState();
    add(makeProduct({ id: "a", priceCents: 1999 }));
    add(makeProduct({ id: "b", priceCents: 50000 }));
    setQty("a", 3);
    setQty("b", 2);

    assert.equal(selectSubtotalCents(useCartStore.getState()), 5997 + 100000);
  });

  it("adds 0 for a free line without disturbing the rest of the subtotal", () => {
    const { add } = useCartStore.getState();
    add(makeProduct({ id: "paid", priceCents: 12345 }));
    add(makeProduct({ id: "gift", priceCents: 0 }));

    assert.equal(selectSubtotalCents(useCartStore.getState()), 12345);
  });

  it("stays an exact integer for a full line at CART_MAX_QTY (no float drift)", () => {
    useCartStore.getState().add(makeProduct({ priceCents: 2_499_999 }));
    useCartStore.getState().setQty("prd_teclado", CART_MAX_QTY);

    const subtotal = selectSubtotalCents(useCartStore.getState());
    assert.equal(subtotal, 247_499_901);
    assert.equal(Number.isSafeInteger(subtotal), true);
  });

  it("equals the sum of lineTotalCents over the same lines", () => {
    const { add, setQty } = useCartStore.getState();
    add(makeProduct({ id: "a", priceCents: 1999 }));
    add(makeProduct({ id: "b", priceCents: 3499 }));
    setQty("a", 4);
    setQty("b", 6);

    const { items } = useCartStore.getState();
    assert.equal(
      selectSubtotalCents(useCartStore.getState()),
      items.reduce((total, item) => total + lineTotalCents(item), 0),
    );
  });
});

describe("lineTotalCents", () => {
  it("returns the total of a single line (priceCents * qty)", () => {
    assert.equal(
      lineTotalCents({
        productId: "a",
        name: "Mouse",
        slug: "mouse",
        imageUrl: null,
        priceCents: 8990,
        qty: 4,
      }),
      35960,
    );
  });

  it("returns the unit price when qty is 1", () => {
    assert.equal(
      lineTotalCents({
        productId: "a",
        name: "Mouse",
        slug: "mouse",
        imageUrl: null,
        priceCents: 8990,
        qty: 1,
      }),
      8990,
    );
  });

  it("returns 0 when the price is 0", () => {
    assert.equal(
      lineTotalCents({
        productId: "gift",
        name: "Sticker",
        slug: "sticker",
        imageUrl: null,
        priceCents: 0,
        qty: 12,
      }),
      0,
    );
  });

  it("returns 0 when the qty is 0", () => {
    assert.equal(
      lineTotalCents({
        productId: "a",
        name: "Mouse",
        slug: "mouse",
        imageUrl: null,
        priceCents: 8990,
        qty: 0,
      }),
      0,
    );
  });

  it("stays an exact integer at the CART_MAX_QTY ceiling", () => {
    const total = lineTotalCents({
      productId: "a",
      name: "Monitor",
      slug: "monitor",
      imageUrl: null,
      priceCents: 1_299_999,
      qty: CART_MAX_QTY,
    });

    assert.equal(total, 128_699_901);
    assert.equal(Number.isSafeInteger(total), true);
  });
});

describe("useCartStore.add", () => {
  it("appends a new line with qty 1 mapping product.id to productId", () => {
    useCartStore.getState().add(makeProduct());

    assert.deepEqual(useCartStore.getState().items, [
      {
        productId: "prd_teclado",
        name: "Teclado mecánico",
        slug: "teclado-mecanico",
        imageUrl: "https://cdn.test/teclado.webp",
        priceCents: 24990,
        qty: 1,
      },
    ]);
  });

  it("keeps a null imageUrl as null instead of coercing it", () => {
    useCartStore.getState().add(makeProduct({ imageUrl: null }));

    assert.equal(useCartStore.getState().items[0].imageUrl, null);
  });

  it("increments the qty of the existing line instead of duplicating it", () => {
    const { add } = useCartStore.getState();
    add(makeProduct());
    add(makeProduct());
    add(makeProduct());

    assert.equal(useCartStore.getState().items.length, 1);
    assert.equal(useCartStore.getState().items[0].qty, 3);
  });

  it("appends distinct products in the order they were added", () => {
    const { add } = useCartStore.getState();
    add(makeProduct({ id: "a" }));
    add(makeProduct({ id: "b" }));
    add(makeProduct({ id: "a" }));

    assert.deepEqual(
      useCartStore.getState().items.map((item) => item.productId),
      ["a", "b"],
    );
    assert.deepEqual(
      useCartStore.getState().items.map((item) => item.qty),
      [2, 1],
    );
  });

  it("refreshes nothing on an existing line: name and price keep the values captured on the first add", () => {
    const { add } = useCartStore.getState();
    add(makeProduct({ priceCents: 24990, name: "Teclado mecánico" }));
    add(makeProduct({ priceCents: 19990, name: "Teclado mecánico (oferta)" }));

    assert.equal(useCartStore.getState().items[0].priceCents, 24990);
    assert.equal(useCartStore.getState().items[0].name, "Teclado mecánico");
  });

  it("stops the line at CART_MAX_QTY no matter how many times it is added", () => {
    const { add } = useCartStore.getState();
    for (let i = 0; i < CART_MAX_QTY + 20; i += 1) {
      add(makeProduct());
    }

    assert.equal(useCartStore.getState().items[0].qty, CART_MAX_QTY);
  });

  it("increments bumpToken on every add, including the ones the cap swallows", () => {
    const { add } = useCartStore.getState();
    add(makeProduct());
    assert.equal(useCartStore.getState().bumpToken, 1);

    add(makeProduct());
    assert.equal(useCartStore.getState().bumpToken, 2);

    useCartStore.getState().setQty("prd_teclado", CART_MAX_QTY);
    add(makeProduct());
    assert.equal(useCartStore.getState().items[0].qty, CART_MAX_QTY);
    assert.equal(useCartStore.getState().bumpToken, 3);
  });

  it("does not open the drawer by itself", () => {
    useCartStore.getState().add(makeProduct());

    assert.equal(useCartStore.getState().isOpen, false);
  });

  it("replaces the items array instead of mutating the previous one", () => {
    const { add } = useCartStore.getState();
    add(makeProduct({ id: "a" }));
    const before = useCartStore.getState().items;
    const beforeLine = before[0];

    add(makeProduct({ id: "a" }));

    assert.notEqual(useCartStore.getState().items, before);
    assert.equal(before.length, 1);
    assert.equal(beforeLine.qty, 1);
  });
});

describe("useCartStore.setQty", () => {
  it("sets the qty of the targeted line and leaves the others untouched", () => {
    const { add, setQty } = useCartStore.getState();
    add(makeProduct({ id: "a" }));
    add(makeProduct({ id: "b" }));

    setQty("a", 4);

    assert.deepEqual(
      useCartStore.getState().items.map((item) => [item.productId, item.qty]),
      [
        ["a", 4],
        ["b", 1],
      ],
    );
  });

  it("removes the line when the qty drops to 0", () => {
    const { add, setQty } = useCartStore.getState();
    add(makeProduct({ id: "a" }));
    add(makeProduct({ id: "b" }));

    setQty("a", 0);

    assert.deepEqual(
      useCartStore.getState().items.map((item) => item.productId),
      ["b"],
    );
  });

  it("removes the line for a negative qty too", () => {
    const { add, setQty } = useCartStore.getState();
    add(makeProduct({ id: "a" }));

    setQty("a", -3);

    assert.deepEqual(useCartStore.getState().items, []);
  });

  it("clamps a qty above the ceiling down to CART_MAX_QTY", () => {
    const { add, setQty } = useCartStore.getState();
    add(makeProduct());

    setQty("prd_teclado", 5000);

    assert.equal(useCartStore.getState().items[0].qty, CART_MAX_QTY);
  });

  it("accepts exactly CART_MAX_QTY unchanged", () => {
    const { add, setQty } = useCartStore.getState();
    add(makeProduct());

    setQty("prd_teclado", CART_MAX_QTY);

    assert.equal(useCartStore.getState().items[0].qty, CART_MAX_QTY);
  });

  it("truncates a fractional qty toward zero instead of rounding it", () => {
    const { add, setQty } = useCartStore.getState();
    add(makeProduct());

    setQty("prd_teclado", 2.9);

    assert.equal(useCartStore.getState().items[0].qty, 2);
  });

  // Documenta el borde real: 0.5 es > 0, así que no entra por la rama de
  // borrado, pero `Math.trunc` lo deja en 0 y la línea sobrevive con cantidad 0.
  // Hoy es inalcanzable desde la UI (los steppers mandan enteros).
  it("leaves a zero-qty line in the cart for a fraction between 0 and 1", () => {
    const { add, setQty } = useCartStore.getState();
    add(makeProduct());

    setQty("prd_teclado", 0.5);

    assert.equal(useCartStore.getState().items.length, 1);
    assert.equal(useCartStore.getState().items[0].qty, 0);
    assert.equal(selectCount(useCartStore.getState()), 0);
    assert.equal(selectSubtotalCents(useCartStore.getState()), 0);
  });

  it("is a no-op for a productId that is not in the cart", () => {
    const { add, setQty } = useCartStore.getState();
    add(makeProduct({ id: "a" }));
    const before = useCartStore.getState().items[0];

    setQty("does-not-exist", 9);

    assert.equal(useCartStore.getState().items.length, 1);
    assert.deepEqual(useCartStore.getState().items[0], before);
  });

  it("removes nothing when asked to zero out a productId that is not in the cart", () => {
    const { add, setQty } = useCartStore.getState();
    add(makeProduct({ id: "a" }));

    setQty("does-not-exist", 0);

    assert.equal(useCartStore.getState().items.length, 1);
  });

  it("does not touch bumpToken: only an add makes the badge bump", () => {
    const { add, setQty } = useCartStore.getState();
    add(makeProduct());
    const tokenAfterAdd = useCartStore.getState().bumpToken;

    setQty("prd_teclado", 7);
    setQty("prd_teclado", 0);

    assert.equal(useCartStore.getState().bumpToken, tokenAfterAdd);
  });
});

describe("useCartStore.clear", () => {
  it("empties every line", () => {
    const { add, clear } = useCartStore.getState();
    add(makeProduct({ id: "a" }));
    add(makeProduct({ id: "b" }));

    clear();

    assert.deepEqual(useCartStore.getState().items, []);
    assert.equal(selectCount(useCartStore.getState()), 0);
    assert.equal(selectSubtotalCents(useCartStore.getState()), 0);
  });

  it("is a no-op on an already empty cart", () => {
    useCartStore.getState().clear();

    assert.deepEqual(useCartStore.getState().items, []);
  });

  it("leaves the drawer open if it was open: clearing is not closing", () => {
    const { add, clear, setOpen } = useCartStore.getState();
    add(makeProduct());
    setOpen(true);

    clear();

    assert.equal(useCartStore.getState().isOpen, true);
  });

  it("leaves bumpToken where it was so no stale bump is replayed", () => {
    const { add, clear } = useCartStore.getState();
    add(makeProduct());
    const tokenAfterAdd = useCartStore.getState().bumpToken;

    clear();

    assert.equal(useCartStore.getState().bumpToken, tokenAfterAdd);
  });
});

describe("useCartStore.setOpen", () => {
  it("opens the drawer", () => {
    useCartStore.getState().setOpen(true);

    assert.equal(useCartStore.getState().isOpen, true);
  });

  it("closes the drawer again", () => {
    const { setOpen } = useCartStore.getState();
    setOpen(true);
    setOpen(false);

    assert.equal(useCartStore.getState().isOpen, false);
  });

  it("does not touch the lines or the bump counter", () => {
    const { add, setOpen } = useCartStore.getState();
    add(makeProduct());
    const items = useCartStore.getState().items;
    const bumpToken = useCartStore.getState().bumpToken;

    setOpen(true);

    assert.equal(useCartStore.getState().items, items);
    assert.equal(useCartStore.getState().bumpToken, bumpToken);
  });
});
