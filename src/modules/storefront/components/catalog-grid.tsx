"use client";

import { ChevronLeft, ChevronRight, SearchX } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { PublicProduct } from "@/modules/products/types/public-product";

import { CATALOG_PAGE_SIZE } from "../lib/catalog";
import { CARD, CIRC, MONO, PILL, PILL_QUIET } from "../lib/styles";
import { CatalogProductCard } from "./catalog-product-card";
import { StorefrontError } from "./storefront-error";

const GRID = "grid grid-cols-2 gap-3.5 lg:grid-cols-3 lg:gap-5";

type CatalogGridProps = {
  products: PublicProduct[];
  isPending: boolean;
  isError: boolean;
  page: number;
  totalPages: number;
  onRetry: () => void;
  onPageChange: (page: number) => void;
  onClear: () => void;
};

function GridSkeleton() {
  return (
    <div className={GRID}>
      {Array.from({ length: CATALOG_PAGE_SIZE }, (_, index) => (
        <Skeleton key={index} className={cn(CARD, "h-[330px]")} />
      ))}
    </div>
  );
}

function EmptyState({ onClear }: { onClear: () => void }) {
  return (
    <div
      className={cn(
        CARD,
        "flex flex-col items-center gap-2 px-10 py-20 text-center lg:py-22",
      )}
    >
      <span className={cn(CIRC, "text-ink-muted size-14")}>
        <SearchX aria-hidden className="size-6" />
      </span>
      <p className="mt-2 text-[16px] font-medium">Nada con estos filtros</p>
      <button
        type="button"
        onClick={onClear}
        className={cn(PILL, PILL_QUIET, "mt-2.5 h-11 px-5 text-[14px]")}
      >
        Limpiar filtros
      </button>
    </div>
  );
}

function Pagination({
  page,
  totalPages,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  return (
    <nav
      aria-label="Paginación del catálogo"
      className="flex items-center justify-center gap-3 pt-6"
    >
      <button
        type="button"
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        className={cn(PILL, PILL_QUIET, "h-11 pr-4 pl-3 text-[14px]")}
      >
        <ChevronLeft aria-hidden className="size-[18px]" />
        Anterior
      </button>
      <span className={cn(MONO, "text-ink-muted text-[13px]")}>
        {page} / {totalPages}
      </span>
      <button
        type="button"
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
        className={cn(PILL, PILL_QUIET, "h-11 pr-3 pl-4 text-[14px]")}
      >
        Siguiente
        <ChevronRight aria-hidden className="size-[18px]" />
      </button>
    </nav>
  );
}

/**
 * Grilla de resultados con sus cuatro estados: carga, error, vacío y datos.
 * La paginación es anterior/siguiente y no numerada: la API devuelve
 * `totalPages`, no una ventana de páginas.
 */
export function CatalogGrid({
  products,
  isPending,
  isError,
  page,
  totalPages,
  onRetry,
  onPageChange,
  onClear,
}: CatalogGridProps) {
  if (isPending) {
    return <GridSkeleton />;
  }

  if (isError) {
    return (
      <div className={CARD}>
        <StorefrontError
          message="No pudimos cargar el catálogo."
          onRetry={onRetry}
          className="py-20"
        />
      </div>
    );
  }

  if (products.length === 0) {
    return <EmptyState onClear={onClear} />;
  }

  return (
    <>
      <div className={GRID}>
        {products.map((product) => (
          <CatalogProductCard key={product.id} product={product} />
        ))}
      </div>

      {totalPages > 1 ? (
        <Pagination
          page={page}
          totalPages={totalPages}
          onPageChange={onPageChange}
        />
      ) : null}
    </>
  );
}
