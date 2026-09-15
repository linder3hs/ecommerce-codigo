"use client";

import { PackageX } from "lucide-react";
import Link from "next/link";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { usePublicProduct } from "@/modules/products/hooks/use-public-product";

import { CATALOG_PATH } from "../lib/catalog";
import { CARD, CIRC, PILL, PILL_QUIET } from "../lib/styles";
import { ProductDetail } from "./product-detail";
import { RelatedProducts } from "./related-products";
import { StorefrontError } from "./storefront-error";

const LAYOUT = "grid gap-3.5 lg:grid-cols-2 lg:items-start lg:gap-5";

function DetailSkeleton() {
  return (
    <div className={LAYOUT}>
      <Skeleton className={cn(CARD, "h-[304px] lg:h-[552px]")} />
      <Skeleton className={cn(CARD, "h-[360px] lg:h-[420px]")} />
    </div>
  );
}

/**
 * Slug que no resuelve. No es un error: la ruta es válida y el producto puede
 * estar despublicado, borrado o pertenecer a una categoría despublicada. Se
 * dibuja la salida al catálogo en vez de una pantalla roja o un 404 del
 * framework, que aquí llegaría tarde porque la ficha resuelve en cliente.
 */
function NotFound() {
  return (
    <div
      className={cn(
        CARD,
        "flex flex-col items-center gap-2 px-10 py-20 text-center lg:py-28",
      )}
    >
      <span className={cn(CIRC, "text-ink-muted size-14")}>
        <PackageX aria-hidden className="size-6" />
      </span>
      <p className="mt-2 text-[16px] font-medium">Producto no encontrado</p>
      <p className="text-ink-muted text-[13.5px]">
        Puede que ya no esté disponible.
      </p>
      <Link
        href={CATALOG_PATH}
        className={cn(PILL, PILL_QUIET, "mt-2.5 h-11 px-5 text-[14px]")}
      >
        Ver el catálogo
      </Link>
    </div>
  );
}

/**
 * Isla cliente de la ficha. Solo resuelve los cuatro estados de la consulta: el
 * carrito lo lee `ProductDetail` directamente del store, como hacen las
 * tarjetas, en vez de bajar cantidad y callbacks por props.
 */
export function ProductDetailView({ slug }: { slug: string }) {
  const query = usePublicProduct(slug);

  if (query.isPending) {
    return <DetailSkeleton />;
  }

  if (query.isError) {
    return (
      <div className={CARD}>
        <StorefrontError
          message="No pudimos cargar este producto."
          onRetry={() => void query.refetch()}
          className="py-20"
        />
      </div>
    );
  }

  const product = query.data;

  if (!product) {
    return <NotFound />;
  }

  return (
    <>
      <ProductDetail product={product} />
      <RelatedProducts product={product} />
    </>
  );
}
