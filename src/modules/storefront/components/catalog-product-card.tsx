"use client";

import Link from "next/link";

import { formatCents } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { PublicProduct } from "@/modules/products/types/public-product";

import { productHref } from "../lib/catalog";
import { discountLabel, isSoldOut, productSpec, stockNote } from "../lib/landing";
import { CARD, FOCUS_RING, LIFT, MONO, ZOOM } from "../lib/styles";
import { AddToCartControl } from "./add-to-cart-control";
import { ProductPhoto } from "./product-photo";

/** Tarjeta de la grilla del catálogo: foto, descuento, precio y alta al carrito. */
export function CatalogProductCard({ product }: { product: PublicProduct }) {
  const soldOut = isSoldOut(product);
  const discount = discountLabel(product);
  const compareAt = product.compareAtPriceCents;

  return (
    <article className={cn(CARD, LIFT, "group flex flex-col p-3")}>
      {/* Solo la foto y el título navegan: el alta al carrito queda fuera del
          enlace para no anidar un `button` dentro de un `a`. */}
      <Link
        href={productHref(product.slug)}
        className={cn("block rounded-photo", FOCUS_RING)}
      >
        <div className="relative">
          <ProductPhoto
            src={product.imageUrl}
            alt={product.name}
            sizes="(min-width: 1024px) 22vw, 45vw"
            className={cn("h-[196px] rounded-photo", soldOut && "opacity-45")}
            imageClassName={ZOOM}
          />
          {discount === null ? null : (
            <span
              className={cn(
                MONO,
                "bg-brand text-on-brand absolute top-3 left-3 inline-flex h-[27px] items-center rounded-full px-[11px] text-[11.5px] font-semibold",
              )}
            >
              {discount}
            </span>
          )}
        </div>

        <div className="px-2 pt-4">
          <p className="line-clamp-2 text-[15px] leading-[1.3] font-medium text-pretty">
            {product.name}
          </p>
          <p className="text-ink-muted mt-[3px] truncate text-[12.5px]">
            {productSpec(product)}
          </p>
        </div>
      </Link>

      <div className="px-2 pb-1.5">
        <div className="mt-4 flex items-end justify-between gap-2.5">
          <div className="min-w-0">
            <p className="text-ink-muted text-[11.5px]">{stockNote(product)}</p>
            <div className="mt-0.5 flex items-baseline gap-2">
              <span
                className={cn(
                  MONO,
                  "text-[19px] font-semibold tracking-[-0.025em]",
                )}
              >
                {formatCents(product.priceCents)}
              </span>
              {discount === null || compareAt === null ? null : (
                <span
                  className={cn(MONO, "text-ink-muted text-[12px] line-through")}
                >
                  {formatCents(compareAt)}
                </span>
              )}
            </div>
          </div>

          <AddToCartControl product={product} />
        </div>
      </div>
    </article>
  );
}
