"use client";

import {
  ArrowUpRight,
  Headphones,
  HardDrive,
  Keyboard,
  Laptop,
  Monitor,
  Package,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { formatCents } from "@/lib/format";
import { cn } from "@/lib/utils";
import { usePublicCategories } from "@/modules/categories/hooks/use-public-categories";
import { usePublicProducts } from "@/modules/products/hooks/use-public-products";
import type { PublicProduct } from "@/modules/products/types/public-product";

import { productHref } from "../lib/catalog";
import {
  discountLabel,
  isSoldOut,
  LANDING_PRODUCTS_QUERY,
  productSpec,
  selectOffers,
  selectSpotlight,
  selectThumbs,
  selectWide,
  stockNote,
} from "../lib/landing";
import { CARD, CIRC, FOCUS_RING, LIFT, MONO, TAG, ZOOM } from "../lib/styles";
import { AddToCartControl } from "./add-to-cart-control";
import { OffersCountdown } from "./offers-countdown";
import { ProductPhoto } from "./product-photo";
import { StorefrontError } from "./storefront-error";

// El icono se elige por slug de categoría; lo que no esté en el mapa cae en
// `Package` en vez de dejar el hueco vacío.
const CATEGORY_ICONS: Record<string, LucideIcon> = {
  laptops: Laptop,
  teclados: Keyboard,
  monitores: Monitor,
  audio: Headphones,
  almacenamiento: HardDrive,
};

function CategoriesCard() {
  const categoriesQuery = usePublicCategories();

  return (
    <div className={cn(CARD, "hidden px-[22px] py-5 lg:block")}>
      <p className="text-[14px] font-medium">Categorías</p>

      {categoriesQuery.isError ? (
        <StorefrontError
          message="No pudimos cargar las categorías."
          onRetry={() => void categoriesQuery.refetch()}
          className="p-2"
        />
      ) : (
        <div className="mt-3.5 flex gap-2">
          {categoriesQuery.isPending
            ? Array.from({ length: 5 }, (_, index) => (
                <Skeleton key={index} className="size-[46px] rounded-full" />
              ))
            : categoriesQuery.data.data.map((category) => {
                const Icon = CATEGORY_ICONS[category.slug] ?? Package;

                return (
                  <Link
                    key={category.id}
                    href={`/products?category=${category.slug}`}
                    title={category.name}
                    className={cn(CIRC, "size-[46px]")}
                  >
                    <Icon aria-hidden className="size-5" />
                    <span className="sr-only">
                      Ver catálogo de {category.name}
                    </span>
                  </Link>
                );
              })}
        </div>
      )}
    </div>
  );
}

/**
 * Enlace que cubre la tarjeta entera. Se usa donde el contenido está apilado
 * sobre la foto y no hay un bloque contiguo que envolver: el resto de la
 * tarjeta es texto, y los controles que sí son interactivos se levantan con
 * `z-10` para quedar por encima.
 */
function CardLink({ product }: { product: PublicProduct }) {
  return (
    <Link
      href={productHref(product.slug)}
      className={cn("absolute inset-0", FOCUS_RING)}
    >
      <span className="sr-only">Ver {product.name}</span>
    </Link>
  );
}

function SpotlightCard({ product }: { product: PublicProduct }) {
  return (
    <article
      className={cn(
        CARD,
        LIFT,
        "group relative hidden min-h-0 flex-1 overflow-hidden lg:block",
      )}
    >
      <ProductPhoto
        src={product.imageUrl}
        alt={product.name}
        sizes="(min-width: 1024px) 30vw, 100vw"
        imageClassName={ZOOM}
      />

      <CardLink product={product} />

      <AddToCartControl
        product={product}
        tone="surface"
        icon="arrow"
        className="absolute top-[18px] right-[18px] z-10"
      />

      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-linear-to-t from-[oklch(0.12_0_0/76%)] to-transparent px-[22px] pt-[26px] pb-5 text-[oklch(0.99_0_0)]">
        <p className="text-[17px] font-semibold tracking-[-0.02em]">
          {product.name}
        </p>
        <div className="mt-1 flex items-baseline justify-between gap-3">
          <span className="truncate text-[12.5px] opacity-78">
            {productSpec(product)}
          </span>
          <span className={cn(MONO, "shrink-0 text-[15px] font-semibold")}>
            {formatCents(product.priceCents)}
          </span>
        </div>
      </div>
    </article>
  );
}

function ThumbsCard({
  thumbs,
  total,
}: {
  thumbs: PublicProduct[];
  total: number;
}) {
  return (
    <section
      className={cn(CARD, "hidden flex-col p-[22px] lg:col-span-4 lg:flex")}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[15px] font-medium">Más productos</p>
          <p className="text-ink-muted mt-0.5 text-[12.5px]">
            {total} en catálogo
          </p>
        </div>
        <Link href="/products" className={cn(CIRC, "size-[38px]")}>
          <ArrowUpRight aria-hidden className="size-4" />
          <span className="sr-only">Ver todo el catálogo</span>
        </Link>
      </div>

      {/* La miniatura es solo la foto: no hay sitio para precio ni para un
          stepper, así que el click lleva a la ficha, que es donde se decide la
          compra. El alta al carrito vive en las tarjetas que sí muestran precio. */}
      <div className="mt-4 grid min-h-0 flex-1 grid-cols-3 gap-2.5">
        {thumbs.map((product) => (
          <Link
            key={product.id}
            href={productHref(product.slug)}
            aria-label={`Ver ${product.name}`}
            className={cn(
              LIFT,
              FOCUS_RING,
              "group bg-sunk relative overflow-hidden rounded-thumb",
              isSoldOut(product) && "opacity-45",
            )}
          >
            <ProductPhoto
              src={product.imageUrl}
              alt=""
              sizes="140px"
              imageClassName={ZOOM}
            />
          </Link>
        ))}
      </div>
    </section>
  );
}

function WideCard({ product }: { product: PublicProduct }) {
  return (
    <article
      className={cn(
        CARD,
        LIFT,
        "group relative hidden overflow-hidden lg:col-span-5 lg:grid lg:grid-cols-2",
      )}
    >
      <div className="flex flex-col justify-between py-[22px] pr-2 pl-6">
        <div className="flex items-center gap-2">
          <span className={cn(TAG, "h-[27px] gap-[5px] px-[11px]")}>
            {stockNote(product)}
          </span>
          {discountLabel(product) === null ? null : (
            <span
              className={cn(
                TAG,
                "bg-brand text-on-brand h-[27px] px-[11px] font-semibold",
              )}
            >
              {discountLabel(product)}
            </span>
          )}
        </div>

        <div>
          <p className="text-[17px] leading-[1.25] font-semibold tracking-[-0.022em] text-pretty">
            {product.name}
          </p>
          <p className="text-ink-muted mt-[3px] text-[12.5px]">
            {productSpec(product)}
          </p>
        </div>

        <div className="flex items-center justify-between gap-2.5">
          <span
            className={cn(MONO, "text-[20px] font-semibold tracking-[-0.025em]")}
          >
            {formatCents(product.priceCents)}
          </span>
          <AddToCartControl
            product={product}
            icon="arrow"
            className="relative z-10"
          />
        </div>
      </div>

      <div className="my-3.5 mr-3.5 overflow-hidden rounded-photo">
        <ProductPhoto
          src={product.imageUrl}
          alt={product.name}
          sizes="(min-width: 1024px) 22vw, 100vw"
          imageClassName={ZOOM}
        />
      </div>

      {/* Último hijo a propósito: `ProductPhoto` es `relative`, así que un enlace
          declarado antes quedaría pintado por debajo de la foto y la mitad
          derecha de la tarjeta no navegaría. */}
      <CardLink product={product} />
    </article>
  );
}

/** Catálogo de mobile: carrusel horizontal con `scroll-snap`, sin librería. */
function MobileCatalog({ products }: { products: PublicProduct[] }) {
  return (
    <section className="lg:hidden">
      <div className="flex items-baseline justify-between px-1.5 pb-3">
        <h2 className="text-[16px] font-semibold tracking-[-0.025em]">
          Catálogo
        </h2>
        <Link
          href="/products"
          className="text-ink-muted hover:text-ink text-[12.5px] transition-colors"
        >
          Ver todo · {products.length} productos
        </Link>
      </div>

      <ul className="snap-row -mx-4 flex gap-3 overflow-x-auto px-4 pb-1">
        {products.map((product) => {
          const soldOut = isSoldOut(product);

          return (
            <li
              key={product.id}
              className={cn(CARD, "snap-item flex w-[176px] shrink-0 flex-col p-2.5")}
            >
              <Link
                href={productHref(product.slug)}
                className={cn("block rounded-thumb", FOCUS_RING)}
              >
                <ProductPhoto
                  src={product.imageUrl}
                  alt={product.name}
                  sizes="168px"
                  className={cn(
                    "h-[124px] rounded-thumb",
                    soldOut && "opacity-45",
                  )}
                />
                <p className="line-clamp-2 px-1.5 pt-3 text-[13.5px] leading-[1.3] font-medium text-pretty">
                  {product.name}
                </p>
              </Link>

              <div className="px-1.5 pb-1">
                <p className="text-ink-muted mt-0.5 text-[11.5px]">
                  {stockNote(product)}
                </p>
                <div className="mt-2.5 flex items-center justify-between gap-2">
                  <span
                    className={cn(
                      MONO,
                      "text-[15px] font-semibold tracking-[-0.02em] whitespace-nowrap",
                    )}
                  >
                    {formatCents(product.priceCents)}
                  </span>
                  <AddToCartControl product={product} size="sm" />
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function BentoSkeleton() {
  return (
    <>
      <div className="hidden lg:col-span-4 lg:flex lg:min-h-0 lg:flex-col lg:gap-5">
        <Skeleton className={cn(CARD, "h-[92px]")} />
        <Skeleton className={cn(CARD, "min-h-0 flex-1")} />
      </div>
      <Skeleton className={cn(CARD, "hidden lg:col-span-4 lg:block")} />
      <Skeleton className={cn(CARD, "h-[86px] lg:col-span-3 lg:h-auto")} />
      <Skeleton className={cn(CARD, "hidden lg:col-span-5 lg:block")} />
      <Skeleton className="h-[248px] lg:hidden" />
    </>
  );
}

/**
 * Resto del bento: categorías, spotlight, miniaturas, contador de ofertas y
 * destacado ancho. Devuelve un fragmento porque la grilla la define la página:
 * el hero es hermano de estas tarjetas, no su padre.
 */
export function LandingBento() {
  const productsQuery = usePublicProducts(LANDING_PRODUCTS_QUERY);
  const products = useMemo(
    () => productsQuery.data?.data ?? [],
    [productsQuery.data],
  );

  const selection = useMemo(() => {
    const spotlight = selectSpotlight(products);
    const wide = selectWide(products);

    return {
      spotlight,
      wide,
      thumbs: selectThumbs(products, [spotlight, wide]),
      offerCount: selectOffers(products).length,
    };
  }, [products]);

  if (productsQuery.isPending) {
    return <BentoSkeleton />;
  }

  if (productsQuery.isError) {
    return (
      <section className={cn(CARD, "lg:col-span-12")}>
        <StorefrontError
          message="No pudimos cargar el catálogo."
          onRetry={() => void productsQuery.refetch()}
        />
      </section>
    );
  }

  return (
    <>
      <div className="hidden lg:col-span-4 lg:flex lg:min-h-0 lg:flex-col lg:gap-5">
        <CategoriesCard />
        {selection.spotlight === null ? null : (
          <SpotlightCard product={selection.spotlight} />
        )}
      </div>

      <ThumbsCard
        thumbs={selection.thumbs}
        total={productsQuery.data.meta.total}
      />

      <OffersCountdown offerCount={selection.offerCount} />

      {selection.wide === null ? null : <WideCard product={selection.wide} />}

      <MobileCatalog products={products} />
    </>
  );
}
