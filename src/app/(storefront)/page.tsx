import type { Metadata } from "next";

import { CartDrawer } from "@/modules/cart/components/cart-drawer";
import { HeroCarousel } from "@/modules/storefront/components/hero-carousel";
import { LandingBento } from "@/modules/storefront/components/landing-bento";
import { StorefrontNav } from "@/modules/storefront/components/storefront-nav";

export const metadata: Metadata = {
  title: "tech. — Tienda de tecnología",
  description:
    "Laptops, teclados, monitores, audio y almacenamiento con envío a todo el país.",
};

/**
 * Landing. Server Component que solo compone: los datos entran por las islas
 * cliente porque un componente no puede tocar el repositorio (regla 1 de
 * `docs/SETUP.md`). El prefetch en servidor queda para el spec del catálogo,
 * donde el SEO del listado sí pesa.
 *
 * La grilla del bento vive acá y no dentro de `LandingBento`: el hero es una
 * celda hermana de las demás tarjetas, no su contenedor.
 */
export default function StorefrontPage() {
  return (
    <div className="flex flex-1 flex-col gap-3.5 px-4 pt-5 pb-27 lg:h-dvh lg:min-h-0 lg:gap-5 lg:overflow-hidden lg:p-8">
      <StorefrontNav />

      <div className="flex flex-col gap-3.5 lg:grid lg:min-h-0 lg:flex-1 lg:grid-cols-12 lg:grid-rows-[1.67fr_1fr] lg:gap-5">
        <HeroCarousel />
        <LandingBento />
      </div>

      <CartDrawer />
    </div>
  );
}
