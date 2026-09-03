import { create } from "zustand";

import type { PublicProduct } from "@/modules/products/types/public-product";

/**
 * Carrito local, en memoria. Zustand y no TanStack Query porque no hay nada que
 * cachear del servidor: una línea de carrito es una decisión del visitante
 * —qué producto, cuántos y a qué precio lo agregó— y no se refresca ni se
 * invalida. El día que el carrito se persista en BD, ese estado vive en un
 * hook de Query y este store se queda solo con `isOpen`.
 *
 * Los importes son enteros de centavos de punta a punta: nunca se divide entre
 * 100 acá, eso solo pasa al formatear con `formatCents`.
 */
export type CartLine = {
  productId: string;
  name: string;
  slug: string;
  imageUrl: string | null;
  priceCents: number;
  qty: number;
};

const MAX_QTY = 99;

type CartState = {
  items: CartLine[];
  isOpen: boolean;
  // Contador que solo sube: el badge lo observa para disparar el `bump` sin
  // tener que adivinar si el cambio de cantidad vino de un alta o de un menos.
  bumpToken: number;
  add: (product: PublicProduct) => void;
  setQty: (productId: string, qty: number) => void;
  clear: () => void;
  setOpen: (open: boolean) => void;
};

function clampQty(qty: number): number {
  return Math.min(MAX_QTY, Math.trunc(qty));
}

export const useCartStore = create<CartState>((set) => ({
  items: [],
  isOpen: false,
  bumpToken: 0,

  add: (product) =>
    set((state) => {
      const existing = state.items.find(
        (item) => item.productId === product.id,
      );

      const items = existing
        ? state.items.map((item) =>
            item.productId === product.id
              ? { ...item, qty: clampQty(item.qty + 1) }
              : item,
          )
        : [
            ...state.items,
            {
              productId: product.id,
              name: product.name,
              slug: product.slug,
              imageUrl: product.imageUrl,
              priceCents: product.priceCents,
              qty: 1,
            },
          ];

      return { items, bumpToken: state.bumpToken + 1 };
    }),

  // Bajar a 0 quita la línea: es el único camino de borrado, así el drawer no
  // necesita un botón de papelera aparte.
  setQty: (productId, qty) =>
    set((state) => ({
      items:
        qty <= 0
          ? state.items.filter((item) => item.productId !== productId)
          : state.items.map((item) =>
              item.productId === productId
                ? { ...item, qty: clampQty(qty) }
                : item,
            ),
    })),

  clear: () => set({ items: [] }),

  setOpen: (open) => set({ isOpen: open }),
}));

// Selectores fuera del store: devuelven primitivos, así el componente que los
// usa solo se vuelve a renderizar cuando cambia el número, no en cada `set`.
export function selectCount(state: CartState): number {
  return state.items.reduce((total, item) => total + item.qty, 0);
}

export function selectSubtotalCents(state: CartState): number {
  return state.items.reduce(
    (total, item) => total + item.priceCents * item.qty,
    0,
  );
}

export function lineTotalCents(item: CartLine): number {
  return item.priceCents * item.qty;
}
