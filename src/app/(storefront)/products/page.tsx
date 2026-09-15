import type { Metadata } from "next";
import { Suspense } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { CartDrawer } from "@/modules/cart/components/cart-drawer";
import { CatalogView } from "@/modules/storefront/components/catalog-view";
import { StorefrontNav } from "@/modules/storefront/components/storefront-nav";
import { CARD } from "@/modules/storefront/lib/styles";

export const metadata: Metadata = {
  title: "Catálogo — tech.",
  description:
    "Filtrá el catálogo de laptops, teclados, monitores, audio y almacenamiento por categoría, precio y disponibilidad.",
};

/** Esqueleto del primer paint, mientras el árbol con `useSearchParams` hidrata. */
function CatalogFallback() {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3.5 lg:flex-row lg:gap-5">
      <Skeleton className={cn(CARD, "h-[420px] shrink-0 lg:h-auto lg:w-[300px]")} />
      <div className="grid min-w-0 flex-1 grid-cols-2 gap-3.5 lg:grid-cols-3 lg:gap-5">
        {Array.from({ length: 6 }, (_, index) => (
          <Skeleton key={index} className={cn(CARD, "h-[330px]")} />
        ))}
      </div>
    </div>
  );
}

/**
 * Catálogo. Server Component que solo compone: el estado vive en la URL y lo
 * lee `CatalogView`, que por usar `useSearchParams` va dentro de `<Suspense>`
 * o el prerender de la página falla.
 */
export default function ProductsPage() {
  return (
    <div className="flex flex-1 flex-col gap-3.5 px-4 pt-5 pb-27 lg:h-dvh lg:min-h-0 lg:gap-5 lg:overflow-hidden lg:p-8">
      <StorefrontNav />

      <Suspense fallback={<CatalogFallback />}>
        <CatalogView />
      </Suspense>

      <CartDrawer />
    </div>
  );
}
