"use client";

import { Search, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { useDebounce } from "@/hooks/use-debounce";
import { formatCents } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useCartStore } from "@/modules/cart/store/cart-store";
import { usePublicProducts } from "@/modules/products/hooks/use-public-products";
import type { PublicProduct } from "@/modules/products/types/public-product";

import {
  MAX_SEARCH_RESULTS,
  SEARCH_DEBOUNCE_MS,
  stockNote,
} from "../lib/landing";
import { CARD, CIRC, CIRC_DARK, MONO } from "../lib/styles";
import { ProductPhoto } from "./product-photo";
import { StorefrontError } from "./storefront-error";

const PLACEHOLDER = "Buscar productos…";

// La cruz nativa de `type="search"` duplicaría el botón de limpiar del diseño,
// pero el tipo se conserva por la semántica de campo de búsqueda.
const INPUT_CLASS =
  "text-ink placeholder:text-ink-muted min-w-0 flex-1 border-0 bg-transparent outline-none [&::-webkit-search-cancel-button]:appearance-none";

/**
 * Búsqueda del storefront. El filtrado corre en el servidor —el catálogo no
 * está entero en el cliente—, así que cada tecla espera 300 ms antes de salir
 * a la red y la consulta solo se dispara con texto escrito.
 */
function useSearchResults(rawQuery: string) {
  const debounced = useDebounce(rawQuery.trim(), SEARCH_DEBOUNCE_MS);

  const params = useMemo(
    () =>
      ({
        page: 1,
        pageSize: MAX_SEARCH_RESULTS,
        search: debounced,
        sortBy: "name",
        sortDir: "asc",
      }) as const,
    [debounced],
  );

  const query = usePublicProducts(params, { enabled: debounced.length > 0 });

  return { debounced, query };
}

type SearchResultsProps = {
  value: string;
  onPicked: () => void;
};

function SearchResults({ value, onPicked }: SearchResultsProps) {
  const add = useCartStore((state) => state.add);
  const { debounced, query } = useSearchResults(value);

  if (query.isPending || debounced !== value.trim()) {
    return (
      <ul className="flex flex-col gap-1">
        {Array.from({ length: 3 }, (_, index) => (
          <li key={index} className="flex items-center gap-3.5 p-2">
            <Skeleton className="size-11 rounded-[14px]" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3.5 w-2/3" />
              <Skeleton className="h-3 w-1/3" />
            </div>
          </li>
        ))}
      </ul>
    );
  }

  if (query.isError) {
    return (
      <StorefrontError
        message="No pudimos buscar en el catálogo."
        onRetry={() => void query.refetch()}
      />
    );
  }

  const results: PublicProduct[] = query.data?.data ?? [];

  if (results.length === 0) {
    return (
      <p className="text-ink-muted px-4 py-8 text-center text-[13.5px] lg:py-[30px]">
        Nada para “{value.trim()}”.
      </p>
    );
  }

  return (
    <ul>
      {results.map((product) => (
        <li key={product.id}>
          <button
            type="button"
            onClick={() => {
              add(product);
              onPicked();
            }}
            className="hover:bg-sunk grid w-full grid-cols-[52px_minmax(0,1fr)_auto] items-center gap-3.5 rounded-[20px] border-0 bg-transparent p-2 text-left transition-colors"
          >
            <ProductPhoto
              src={product.imageUrl}
              alt={product.name}
              sizes="52px"
              className="h-11 rounded-[14px]"
            />
            <span className="min-w-0">
              <span className="block truncate text-[14px] font-medium">
                {product.name}
              </span>
              <span className="text-ink-muted block text-[12px]">
                {product.category.name} · {stockNote(product)}
              </span>
            </span>
            <span className={cn(MONO, "text-[14px] font-medium")}>
              {formatCents(product.priceCents)}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}

/** Buscador de escritorio: píldora en la nav y panel flotante bajo ella. */
export function DesktopSearch() {
  const [value, setValue] = useState("");
  const isOpen = value.trim() !== "";

  return (
    <div className="relative hidden max-w-[560px] flex-1 lg:block">
      <div
        className={cn(
          CARD,
          "flex h-[60px] items-center gap-3 rounded-full pr-2 pl-[22px]",
        )}
      >
        <label className="sr-only" htmlFor="storefront-search">
          Buscar productos
        </label>
        <input
          id="storefront-search"
          type="search"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder={PLACEHOLDER}
          className={cn(INPUT_CLASS, "text-[14.5px]")}
        />
        <button
          type="button"
          onClick={() => setValue("")}
          aria-label={isOpen ? "Limpiar búsqueda" : "Buscar"}
          className={cn(CIRC, CIRC_DARK)}
        >
          {isOpen ? (
            <X aria-hidden className="size-[18px]" />
          ) : (
            <Search aria-hidden className="size-[18px]" />
          )}
        </button>
      </div>

      {isOpen ? (
        <>
          <div
            aria-hidden
            onClick={() => setValue("")}
            className="storefront-overlay animate-in fade-in-0 fixed inset-0 z-40 duration-200"
          />
          <div
            className={cn(
              CARD,
              "animate-in fade-in-0 slide-in-from-top-2 absolute top-[calc(100%+12px)] left-0 z-50 w-[560px] rounded-bento p-2.5 shadow-float duration-200",
            )}
          >
            <SearchResults value={value} onPicked={() => setValue("")} />
          </div>
        </>
      ) : null}
    </div>
  );
}

type MobileSearchProps = {
  open: boolean;
  onClose: () => void;
};

/** Buscador de mobile: pantalla completa, como en `Mobile.dc.html`. */
export function MobileSearch({ open, onClose }: MobileSearchProps) {
  const [value, setValue] = useState("");

  useEffect(() => {
    if (!open) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  const close = () => {
    setValue("");
    onClose();
  };

  return (
    <div className="storefront-canvas animate-in fade-in-0 fixed inset-0 z-70 flex flex-col gap-3 px-4 pt-5 pb-5 duration-200 lg:hidden">
      <div className="flex items-center gap-2.5">
        <div
          className={cn(
            CARD,
            "flex h-14 flex-1 items-center rounded-full px-5",
          )}
        >
          <label className="sr-only" htmlFor="storefront-search-mobile">
            Buscar productos
          </label>
          <input
            id="storefront-search-mobile"
            type="search"
            autoFocus
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder={PLACEHOLDER}
            className={cn(INPUT_CLASS, "text-[15px]")}
          />
        </div>
        <button
          type="button"
          onClick={close}
          aria-label="Cerrar búsqueda"
          className={cn(CIRC, CARD, "size-14 rounded-full")}
        >
          <X aria-hidden className="size-[18px]" />
        </button>
      </div>

      <div className={cn(CARD, "min-h-0 flex-1 overflow-y-auto p-2.5")}>
        {value.trim() === "" ? (
          <p className="text-ink-muted px-5 py-12 text-center text-[13.5px]">
            Escribí para buscar en el catálogo.
          </p>
        ) : (
          <SearchResults value={value} onPicked={close} />
        )}
      </div>
    </div>
  );
}
