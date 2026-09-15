"use client";

import { useCartStore } from "../store/cart-store";

/**
 * Cantidad de un producto en el carrito, 0 si no está.
 *
 * Devuelve un primitivo a propósito: el selector se compara por `===`, así que
 * la tarjeta solo se vuelve a renderizar cuando cambia su propio número y no
 * cada vez que se toca otra línea del carrito.
 */
export function useCartQty(productId: string): number {
  return useCartStore(
    (state) =>
      state.items.find((item) => item.productId === productId)?.qty ?? 0,
  );
}
