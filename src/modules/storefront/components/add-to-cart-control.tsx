"use client";

import { ArrowUpRight, Minus, Plus } from "lucide-react";

import { cn } from "@/lib/utils";
import { useCartQty } from "@/modules/cart/hooks/use-cart-qty";
import { CART_MAX_QTY, useCartStore } from "@/modules/cart/store/cart-store";
import type { PublicProduct } from "@/modules/products/types/public-product";

import { isSoldOut } from "../lib/landing";
import { CIRC, CIRC_DARK, MONO, STEPPER, STEPPER_DARK } from "../lib/styles";

type ControlSize = "sm" | "md";
type ControlTone = "dark" | "surface";
type ControlIcon = "plus" | "arrow";

// El interior del stepper es el alto del círculo menos los 3px de padding de
// cada lado: así el control mantiene la altura de la fila al cambiar de estado.
const SIZES = {
  sm: {
    control: "size-[34px]",
    height: "h-[34px]",
    inner: "size-7",
    glyph: "size-[15px]",
    innerGlyph: "size-3",
    qty: "min-w-[18px] text-[12.5px]",
  },
  md: {
    control: "size-10",
    height: "h-10",
    inner: "size-[34px]",
    glyph: "size-4",
    innerGlyph: "size-3.5",
    qty: "min-w-[22px] text-[13.5px]",
  },
} as const satisfies Record<ControlSize, Record<string, string>>;

const TONES = {
  dark: {
    control: CIRC_DARK,
    container: STEPPER_DARK,
    // `text-surface` explícito: `CIRC` trae `text-ink`, que sobre el `bg-ink`
    // del contenedor deja el icono del mismo color que el fondo en los dos temas.
    inner:
      "bg-transparent text-surface hover:bg-[color-mix(in_oklch,var(--ink),var(--surface)_16%)]",
  },
  surface: {
    control: "bg-surface",
    container: "bg-surface",
    inner: "bg-transparent",
  },
} as const satisfies Record<ControlTone, Record<string, string>>;

/**
 * Alta y ajuste de cantidad desde la tarjeta: con el producto fuera del carrito
 * es el botón circular de siempre y, en cuanto hay una unidad, se convierte en
 * el stepper `− N +`. La cantidad sale del store, no de estado local, para que
 * todas las tarjetas del mismo producto —y el drawer— muestren el mismo número.
 */
export function AddToCartControl({
  product,
  size = "md",
  tone = "dark",
  icon = "plus",
  className,
}: {
  product: PublicProduct;
  size?: ControlSize;
  tone?: ControlTone;
  icon?: ControlIcon;
  className?: string;
}) {
  const add = useCartStore((state) => state.add);
  const setQty = useCartStore((state) => state.setQty);
  const qty = useCartQty(product.id);
  const soldOut = isSoldOut(product);
  const sizing = SIZES[size];
  const toning = TONES[tone];

  if (qty === 0 || soldOut) {
    const Glyph = icon === "arrow" ? ArrowUpRight : Plus;

    return (
      <button
        type="button"
        onClick={() => add(product)}
        disabled={soldOut}
        aria-label={
          soldOut ? `${product.name}: agotado` : `Agregar ${product.name}`
        }
        className={cn(CIRC, toning.control, sizing.control, className)}
      >
        <Glyph aria-hidden className={sizing.glyph} />
      </button>
    );
  }

  const innerClassName = cn(CIRC, toning.inner, sizing.inner);

  return (
    <div
      role="group"
      aria-label={`Cantidad de ${product.name}`}
      className={cn(STEPPER, toning.container, sizing.height, className)}
    >
      <button
        type="button"
        onClick={() => setQty(product.id, qty - 1)}
        aria-label={`Quitar uno de ${product.name}`}
        className={innerClassName}
      >
        <Minus aria-hidden className={sizing.innerGlyph} />
      </button>

      <span
        aria-live="polite"
        className={cn(MONO, sizing.qty, "text-center font-medium")}
      >
        {qty}
      </span>

      <button
        type="button"
        onClick={() => setQty(product.id, qty + 1)}
        disabled={qty >= CART_MAX_QTY}
        aria-label={`Agregar uno de ${product.name}`}
        className={innerClassName}
      >
        <Plus aria-hidden className={sizing.innerGlyph} />
      </button>
    </div>
  );
}
