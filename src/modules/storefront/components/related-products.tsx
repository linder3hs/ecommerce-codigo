"use client";

import { useMemo } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { usePublicProducts } from "@/modules/products/hooks/use-public-products";
import type { PublicProductQueryInput } from "@/modules/products/schemas/public-product.schema";
import type { PublicProduct } from "@/modules/products/types/public-product";

import { CARD } from "../lib/styles";
import { CatalogProductCard } from "./catalog-product-card";
import { StorefrontError } from "./storefront-error";

const GRID = "grid grid-cols-2 gap-3.5 lg:grid-cols-4 lg:gap-5";

// Se piden más de los que se muestran: el producto de la ficha viene en la
// misma página y hay que descontarlo sin quedarse corto.
const FETCH_SIZE = 8;
const MAX_RELATED = 4;

function RelatedSkeleton() {
  return (
    <div className={GRID}>
      {Array.from({ length: MAX_RELATED }, (_, index) => (
        <Skeleton key={index} className={cn(CARD, "h-[330px]")} />
      ))}
    </div>
  );
}

/**
 * Productos de la misma categoría al pie de la ficha. Reusa la consulta pública
 * del catálogo —no hay endpoint de "relacionados"— y se apaga entera cuando la
 * categoría no tiene nada más que ofrecer, para no dejar un hueco con título.
 */
export function RelatedProducts({ product }: { product: PublicProduct }) {
  const params = useMemo<PublicProductQueryInput>(
    () => ({
      page: 1,
      pageSize: FETCH_SIZE,
      categorySlug: product.category.slug,
      sortBy: "createdAt",
      sortDir: "desc",
    }),
    [product.category.slug],
  );

  const query = usePublicProducts(params);

  const related = useMemo(
    () =>
      (query.data?.data ?? [])
        .filter((candidate) => candidate.id !== product.id)
        .slice(0, MAX_RELATED),
    [query.data, product.id],
  );

  if (!query.isPending && !query.isError && related.length === 0) {
    return null;
  }

  return (
    <section aria-labelledby="related-products" className="mt-1.5 lg:mt-3">
      <h2
        id="related-products"
        className="px-1.5 pb-3.5 text-[16px] font-semibold tracking-[-0.025em] lg:pb-5 lg:text-[18px]"
      >
        También te puede interesar
      </h2>

      {query.isPending ? <RelatedSkeleton /> : null}

      {query.isError ? (
        <div className={CARD}>
          <StorefrontError
            message="No pudimos cargar productos parecidos."
            onRetry={() => void query.refetch()}
            className="py-12"
          />
        </div>
      ) : null}

      {query.isPending || query.isError ? null : (
        <div className={GRID}>
          {related.map((candidate) => (
            <CatalogProductCard key={candidate.id} product={candidate} />
          ))}
        </div>
      )}
    </section>
  );
}
