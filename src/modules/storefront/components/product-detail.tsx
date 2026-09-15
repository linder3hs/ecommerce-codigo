"use client";

import { Minus, Plus } from "lucide-react";

import { formatCents } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useCartQty } from "@/modules/cart/hooks/use-cart-qty";
import { CART_MAX_QTY, useCartStore } from "@/modules/cart/store/cart-store";
import type { PublicProduct } from "@/modules/products/types/public-product";

import { discountLabel, isSoldOut, stockNote } from "../lib/landing";
import {
  CARD,
  CIRC,
  MONO,
  PILL,
  PILL_BRAND,
  STEPPER_BRAND,
  TAG,
} from "../lib/styles";
import { ProductPhoto } from "./product-photo";

// La acción principal ocupa siempre el mismo hueco: alto y separación fijos
// para que la tarjeta no salte al pasar de botón a stepper.
const ACTION = "mt-8 h-13 text-[15px]";

// Círculo interno del stepper sobre el acento: `CIRC` trae `bg-sunk text-ink`,
// que sobre el `bg-brand` del contenedor no contrasta en ninguno de los dos
// temas, así que el fondo se hace transparente y el glifo hereda `--on-brand`.
const STEP_BUTTON = `${CIRC} bg-transparent text-on-brand hover:bg-[color-mix(in_oklch,var(--brand),var(--on-brand)_14%)]`;

/**
 * Ficha del producto. Habla con el carrito igual que `AddToCartControl`: la
 * cantidad sale del store, no de una prop, para que abrir la ficha de algo que
 * ya está en el carrito muestre el stepper con su número real y no un "Agregar"
 * que vuelva a sumar de uno. Toda la lógica de negocio —agotado, descuento,
 * stock— sale de los selectores puros de `lib/landing`.
 */
export function ProductDetail({ product }: { product: PublicProduct }) {
  const add = useCartStore((state) => state.add);
  const setQty = useCartStore((state) => state.setQty);
  const qty = useCartQty(product.id);
  const soldOut = isSoldOut(product);
  const discount = discountLabel(product);
  const compareAt = product.compareAtPriceCents;
  const description = product.description?.trim();

  return (
    <article className="grid gap-3.5 lg:grid-cols-2 lg:items-start lg:gap-5">
      <div className={cn(CARD, "relative p-3 lg:p-4")}>
        <ProductPhoto
          src={product.imageUrl}
          alt={product.name}
          sizes="(min-width: 1024px) 44vw, 92vw"
          priority
          className={cn(
            "h-[280px] rounded-photo lg:h-[520px]",
            soldOut && "opacity-45",
          )}
        />
        {discount === null ? null : (
          <span
            className={cn(
              MONO,
              "bg-brand text-on-brand absolute top-6 left-6 inline-flex h-8 items-center rounded-full px-3.5 text-[12.5px] font-semibold lg:top-7 lg:left-7",
            )}
          >
            {discount}
          </span>
        )}
      </div>

      <div className={cn(CARD, "flex flex-col p-5 lg:p-8")}>
        {/* `self-start` porque el contenedor es una columna flex y sin esto la
            píldora se estiraría a todo el ancho de la tarjeta. */}
        <span className={cn(TAG, "self-start")}>{product.category.name}</span>

        <h1 className="mt-4 text-[26px] leading-[1.15] font-semibold tracking-[-0.03em] text-balance lg:text-[34px]">
          {product.name}
        </h1>

        <div className="mt-5 flex items-baseline gap-3">
          <span
            className={cn(
              MONO,
              "text-[28px] font-semibold tracking-[-0.03em] lg:text-[32px]",
            )}
          >
            {formatCents(product.priceCents)}
          </span>
          {discount === null || compareAt === null ? null : (
            <span
              className={cn(MONO, "text-ink-muted text-[15px] line-through")}
            >
              {formatCents(compareAt)}
            </span>
          )}
        </div>

        <p className="text-ink-muted mt-2 text-[13px]">{stockNote(product)}</p>

        {description === undefined || description === "" ? null : (
          <p className="mt-6 text-[14.5px] leading-[1.6] text-pretty">
            {description}
          </p>
        )}

        {qty === 0 || soldOut ? (
          <button
            type="button"
            onClick={() => add(product)}
            disabled={soldOut}
            className={cn(PILL, PILL_BRAND, ACTION, "justify-center px-6")}
          >
            <Plus aria-hidden className="size-[18px]" />
            {soldOut ? "Agotado" : "Agregar al carrito"}
          </button>
        ) : (
          <div
            role="group"
            aria-label={`Cantidad de ${product.name}`}
            className={cn(
              PILL,
              STEPPER_BRAND,
              ACTION,
              "justify-between p-1 font-semibold",
            )}
          >
            <button
              type="button"
              onClick={() => setQty(product.id, qty - 1)}
              aria-label={`Quitar uno de ${product.name}`}
              className={STEP_BUTTON}
            >
              <Minus aria-hidden className="size-[18px]" />
            </button>

            <span
              aria-live="polite"
              className={cn(MONO, "flex-1 text-center text-[16px]")}
            >
              {qty}
            </span>

            <button
              type="button"
              onClick={() => setQty(product.id, qty + 1)}
              disabled={qty >= CART_MAX_QTY}
              aria-label={`Agregar uno de ${product.name}`}
              className={STEP_BUTTON}
            >
              <Plus aria-hidden className="size-[18px]" />
            </button>
          </div>
        )}
      </div>
    </article>
  );
}
