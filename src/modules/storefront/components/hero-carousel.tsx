"use client";

import { ArrowUpRight, ChevronLeft, ChevronRight } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { formatCents } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useCartStore } from "@/modules/cart/store/cart-store";
import { usePublicProducts } from "@/modules/products/hooks/use-public-products";

import { productHref } from "../lib/catalog";
import {
  AUTOPLAY_MS,
  discountLabel,
  isSoldOut,
  LANDING_PRODUCTS_QUERY,
  productSpec,
  selectHeroSlides,
} from "../lib/landing";
import {
  CARD,
  CIRC,
  CIRC_DARK,
  FOCUS_RING,
  MONO,
  PILL,
  PILL_BRAND,
  TAG,
} from "../lib/styles";
import { ProductPhoto } from "./product-photo";
import { StorefrontError } from "./storefront-error";

const EASE = [0.22, 1, 0.36, 1] as const;

const SECTION = cn(
  CARD,
  "relative overflow-hidden p-3 pb-5 lg:col-span-8 lg:grid lg:grid-cols-2 lg:p-0",
);

const PHOTO_BOX =
  "relative order-first h-[232px] overflow-hidden rounded-[18px] lg:order-last lg:m-3.5 lg:ml-0 lg:h-auto lg:rounded-photo";

function pad(value: number): string {
  return String(value + 1).padStart(2, "0");
}

/**
 * Carrusel de ofertas. Cuatro slides sin track horizontal: el texto y la foto
 * entran por separado, así que la transición es `AnimatePresence` + `key` y no
 * hace falta una librería de sliders.
 */
export function HeroCarousel() {
  const productsQuery = usePublicProducts(LANDING_PRODUCTS_QUERY);
  const add = useCartStore((state) => state.add);
  const reduceMotion = useReducedMotion();

  const slides = useMemo(
    () => selectHeroSlides(productsQuery.data?.data ?? []),
    [productsQuery.data],
  );

  const [index, setIndex] = useState(0);
  // Sube en cada acción manual para que el autoplay vuelva a empezar aunque el
  // slide destino sea el que ya estaba.
  const [cycle, setCycle] = useState(0);

  const total = slides.length;
  const active = total === 0 ? 0 : index % total;
  const slide = slides[active];

  useEffect(() => {
    if (total < 2) {
      return;
    }

    const timer = setTimeout(
      () => setIndex((current) => (current + 1) % total),
      AUTOPLAY_MS,
    );

    return () => clearTimeout(timer);
  }, [active, total, cycle]);

  const go = useCallback(
    (next: number) => {
      if (total === 0) {
        return;
      }

      setIndex(((next % total) + total) % total);
      setCycle((current) => current + 1);
    },
    [total],
  );

  if (productsQuery.isPending) {
    return (
      <section className={SECTION} aria-busy>
        <div className={cn(PHOTO_BOX, "lg:order-last")}>
          <Skeleton className="size-full" />
        </div>
        <div className="flex flex-col gap-4 px-2.5 pt-[18px] lg:px-8 lg:py-10 lg:pl-10">
          <Skeleton className="h-[30px] w-24 rounded-full" />
          <Skeleton className="h-[62px] w-4/5" />
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-[52px] w-full rounded-full lg:w-56" />
        </div>
      </section>
    );
  }

  if (productsQuery.isError || slide === undefined) {
    return (
      <section className={cn(SECTION, "lg:block")}>
        <StorefrontError
          message={
            productsQuery.isError
              ? "No pudimos cargar las ofertas."
              : "Todavía no hay productos publicados."
          }
          onRetry={() => void productsQuery.refetch()}
          className="h-full min-h-[280px]"
        />
      </section>
    );
  }

  const off = discountLabel(slide);
  const soldOut = isSoldOut(slide);
  const duration = reduceMotion ? 0 : undefined;

  return (
    <section className={SECTION} aria-roledescription="carrusel">
      <div className={PHOTO_BOX}>
        <AnimatePresence initial={false} mode="wait">
          <motion.div
            key={slide.id}
            initial={{ opacity: 0, scale: reduceMotion ? 1 : 1.05 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: duration ?? 0.62, ease: EASE }}
            className="size-full"
          >
            {/* Duplica el enlace del título: fuera del orden de tabulación y
                oculto a lectores de pantalla para no anunciar dos veces el
                mismo destino. */}
            <Link
              href={productHref(slide.slug)}
              aria-hidden
              tabIndex={-1}
              className="block size-full"
            >
              <ProductPhoto
                src={slide.imageUrl}
                alt={slide.name}
                sizes="(min-width: 1024px) 40vw, 100vw"
                priority
              />
            </Link>
          </motion.div>
        </AnimatePresence>

        {off === null ? null : (
          <span
            className={cn(
              MONO,
              "absolute top-3 left-3 inline-flex h-7 items-center rounded-full bg-brand px-3 text-[12px] font-semibold text-on-brand lg:top-4 lg:right-4 lg:left-auto lg:h-[30px]",
            )}
          >
            {off}
          </span>
        )}
      </div>

      <div className="flex flex-col px-2.5 pt-[18px] lg:px-8 lg:pt-10 lg:pr-8 lg:pb-9 lg:pl-10">
        <AnimatePresence initial={false} mode="wait">
          <motion.div
            key={slide.id}
            initial={{ opacity: 0, y: reduceMotion ? 0 : 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: duration ?? 0.52, ease: EASE }}
          >
            <span className={TAG}>{slide.category.name}</span>
            <h1 className="mt-3.5 text-[31px] leading-[1.05] font-semibold tracking-[-0.04em] text-pretty lg:mt-[22px] lg:text-[47px] lg:leading-[1.03] lg:tracking-[-0.042em]">
              <Link
                href={productHref(slide.slug)}
                className={cn("rounded-[6px]", FOCUS_RING)}
              >
                {slide.name}
              </Link>
            </h1>

            <div className="mt-3.5 flex items-center gap-5 lg:mt-[26px]">
              <span
                className={cn(
                  MONO,
                  "hidden text-[34px] font-medium tracking-[-0.03em] text-hairline lg:inline",
                )}
              >
                {pad(active)}
              </span>
              <span className="hidden h-px w-[46px] bg-hairline lg:block" />
              <div>
                <div className="flex items-baseline gap-2.5">
                  <span
                    className={cn(
                      MONO,
                      "text-[23px] font-semibold tracking-[-0.028em] lg:text-[25px]",
                    )}
                  >
                    {formatCents(slide.priceCents)}
                  </span>
                  {slide.compareAtPriceCents === null ? null : (
                    <span
                      className={cn(
                        MONO,
                        "text-[12.5px] text-ink-muted line-through lg:text-[13px]",
                      )}
                    >
                      {formatCents(slide.compareAtPriceCents)}
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-[12.5px] text-ink-muted">
                  {productSpec(slide)}
                </p>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        <button
          type="button"
          onClick={() => add(slide)}
          disabled={soldOut}
          className={cn(
            PILL,
            PILL_BRAND,
            "mt-[18px] h-[52px] w-full pr-2 pl-[22px] text-[15px] lg:mt-[30px] lg:h-[54px] lg:w-auto lg:self-start lg:pl-6",
          )}
        >
          <span className="flex-1 text-left lg:flex-none">
            {soldOut ? "Agotado" : "Agregar al carrito"}
          </span>
          <span className="flex size-9 items-center justify-center rounded-full bg-on-brand text-brand lg:size-[38px]">
            <ArrowUpRight aria-hidden className="size-[17px]" />
          </span>
        </button>

        <div className="mt-4 flex items-center justify-between lg:mt-auto lg:pt-7">
          <div className="flex items-center gap-[7px] lg:gap-2">
            {slides.map((item, position) => (
              <button
                key={item.id}
                type="button"
                onClick={() => go(position)}
                aria-label={`Ver ${item.name}`}
                aria-current={position === active}
                className={cn(
                  "h-1 rounded-[4px] transition-[width,background-color] duration-300",
                  position === active
                    ? "w-[26px] bg-ink lg:w-7"
                    : "w-3 bg-hairline lg:w-3.5",
                )}
              />
            ))}
          </div>

          <div className="hidden gap-1.5 lg:flex">
            <button
              type="button"
              onClick={() => go(active - 1)}
              aria-label="Oferta anterior"
              className={cn(CIRC, "size-10")}
            >
              <ChevronLeft aria-hidden className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => go(active + 1)}
              aria-label="Oferta siguiente"
              className={cn(CIRC, CIRC_DARK, "size-10")}
            >
              <ChevronRight aria-hidden className="size-4" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
