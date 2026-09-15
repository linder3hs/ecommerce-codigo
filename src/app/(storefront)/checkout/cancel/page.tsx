import { ShoppingBag } from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/utils";
import { CartDrawer } from "@/modules/cart/components/cart-drawer";
import { StorefrontNav } from "@/modules/storefront/components/storefront-nav";
import { CATALOG_PATH } from "@/modules/storefront/lib/catalog";
import { CARD, CIRC, PILL, PILL_BRAND } from "@/modules/storefront/lib/styles";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pago cancelado — tech.",
  robots: { index: false, follow: false },
};

/**
 * Vuelta desde Stripe sin pagar. Server Component puro: no consulta nada y no
 * toca el carrito, que sigue con sus líneas para poder reintentar el pago.
 */
export default function CheckoutCancelPage() {
  return (
    <div className="flex flex-1 flex-col gap-3.5 px-4 pt-5 pb-27 lg:gap-5 lg:p-8">
      <StorefrontNav />

      <main className="flex flex-1 items-center justify-center py-6 lg:py-10">
        <div
          className={cn(
            CARD,
            "mx-auto flex w-full max-w-[520px] flex-col items-center px-6 py-12 text-center lg:px-10 lg:py-16",
          )}
        >
          <span className={cn(CIRC, "text-ink-muted size-14")}>
            <ShoppingBag aria-hidden className="size-6" />
          </span>

          <h1 className="mt-4 text-[22px] font-semibold tracking-[-0.03em] lg:text-[26px]">
            Cancelaste el pago
          </h1>
          <p className="text-ink-muted mt-1.5 max-w-[380px] text-[14px]">
            No se te cobró nada. Tu carrito quedó tal como estaba, así que podés
            retomar la compra cuando quieras.
          </p>

          <Link
            href={CATALOG_PATH}
            className={cn(PILL, PILL_BRAND, "mt-7 h-12 px-6 text-[14px]")}
          >
            Volver al catálogo
          </Link>
        </div>
      </main>

      <CartDrawer />
    </div>
  );
}
