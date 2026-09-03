"use client";

import { Heart, House, Search, ShoppingBag, UserRound } from "lucide-react";
import { useAnimate } from "motion/react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";
import { selectCount, useCartStore } from "@/modules/cart/store/cart-store";

import {
  CARD,
  CIRC,
  EASE_OUT,
  MONO,
  PILL,
  PILL_BRAND,
  PILL_QUIET,
} from "../lib/styles";
import { DesktopSearch, MobileSearch } from "./storefront-search";
import { ThemeToggle } from "./theme-toggle";

// Misma curva y duración que el `.bump` del diseño.
const BUMP_KEYFRAMES = { scale: [1, 1.32, 1] };
const BUMP_TRANSITION = { duration: 0.42, ease: [0.22, 1, 0.36, 1] } as const;

/**
 * Ancla la animación del badge al alta de un producto. Se dispara con
 * `bumpToken` y no con el total: bajar una cantidad también cambia el número y
 * ahí no hay nada que celebrar.
 */
function useCartBump(): ReturnType<typeof useAnimate<HTMLSpanElement>>[0] {
  const [scope, animate] = useAnimate<HTMLSpanElement>();
  const bumpToken = useCartStore((state) => state.bumpToken);

  useEffect(() => {
    if (bumpToken === 0 || scope.current === null) {
      return;
    }

    void animate(scope.current, BUMP_KEYFRAMES, BUMP_TRANSITION);
  }, [bumpToken, animate, scope]);

  return scope;
}

function Logo() {
  return (
    <Link
      href="/"
      className={cn(
        CARD,
        "flex h-14 items-center gap-2 rounded-full px-5 lg:h-[60px] lg:gap-2.5 lg:px-6",
      )}
    >
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
        className="size-[22px] lg:size-6"
      >
        <rect
          x="2.5"
          y="2.5"
          width="19"
          height="19"
          rx="6"
          stroke="currentColor"
          strokeWidth="1.7"
        />
        <path
          d="M8 15.5l3.4-7 3.4 7M9.4 13h4"
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span className="text-[16px] font-semibold tracking-[-0.03em] lg:text-[17px]">
        tech.
      </span>
      <span className="sr-only">Ir al inicio</span>
    </Link>
  );
}

function DesktopCartButton() {
  const count = useCartStore(selectCount);
  const setOpen = useCartStore((state) => state.setOpen);
  const scope = useCartBump();

  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      aria-label={`Abrir carrito, ${count} productos`}
      className={cn(CIRC, "relative")}
    >
      <ShoppingBag aria-hidden className="size-[19px]" />
      {count > 0 ? (
        <span
          ref={scope}
          className={cn(
            MONO,
            "bg-brand text-on-brand absolute -top-px -right-px inline-flex h-[19px] min-w-[19px] items-center justify-center rounded-full px-[5px] text-[10.5px] font-semibold",
          )}
        >
          {count}
        </span>
      ) : null}
    </button>
  );
}

function MobileBar({ onSearch }: { onSearch: () => void }) {
  const count = useCartStore(selectCount);
  const setOpen = useCartStore((state) => state.setOpen);
  const scope = useCartBump();

  return (
    <nav
      aria-label="Acciones"
      className={cn(
        CARD,
        "fixed right-4 bottom-5 left-4 z-40 flex items-center gap-1.5 rounded-full p-2 shadow-float lg:hidden",
      )}
    >
      <Link
        href="/"
        className={cn(PILL, "h-12 flex-1 justify-center text-[14px]")}
      >
        <House aria-hidden className="size-[19px]" />
        Inicio
      </Link>
      <button
        type="button"
        onClick={onSearch}
        className={cn(
          PILL,
          "text-ink-muted h-12 flex-1 justify-center text-[14px]",
        )}
      >
        <Search aria-hidden className="size-[19px]" />
        Buscar
      </button>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Abrir carrito, ${count} productos`}
        className={cn(PILL, PILL_BRAND, "h-12 px-5 text-[14px]")}
      >
        <ShoppingBag aria-hidden className="size-[19px]" />
        {count > 0 ? (
          <span ref={scope} className={cn(MONO, "font-semibold")}>
            {count}
          </span>
        ) : null}
      </button>
    </nav>
  );
}

/**
 * Nav del storefront en tres píldoras (logo, buscador, acciones) en escritorio
 * y en una barra flotante inferior en mobile, como los dos artboards. Es la
 * única isla cliente que vive siempre montada: de ella cuelgan el buscador, el
 * carrito y el tema.
 */
export function StorefrontNav() {
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <>
      <header
        className={cn(
          "relative z-30 flex shrink-0 items-center gap-2.5 lg:gap-4",
          EASE_OUT,
        )}
      >
        <div className="flex flex-1 items-center gap-2.5 lg:flex-none lg:gap-4">
          <Logo />
          <DesktopSearch />
        </div>

        <ThemeToggle className={cn(CARD, "size-14 rounded-full lg:hidden")} />

        <div
          className={cn(
            CARD,
            "ml-auto hidden h-[60px] items-center gap-1 rounded-full px-2 lg:flex",
          )}
        >
          <DesktopCartButton />
          {/* Decorativo hasta que exista el spec de favoritos: sin estado que
              guardar, un click no tendría a dónde ir. */}
          <button
            type="button"
            disabled
            aria-label="Favoritos, disponible próximamente"
            className={cn(CIRC)}
          >
            <Heart aria-hidden className="size-[19px]" />
          </button>
          <ThemeToggle />
          <Link
            href="/sign-in"
            className={cn(
              PILL,
              PILL_QUIET,
              "h-11 pr-2 pl-4 text-[14px] gap-2.5",
            )}
          >
            Ingresar
            <span className="bg-surface text-ink flex size-7 items-center justify-center rounded-full">
              <UserRound aria-hidden className="size-[15px]" />
            </span>
          </Link>
        </div>
      </header>

      <MobileBar onSearch={() => setSearchOpen(true)} />
      <MobileSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
