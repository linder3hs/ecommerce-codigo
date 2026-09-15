import type { Metadata } from "next";

import { CartDrawer } from "@/modules/cart/components/cart-drawer";
import { ProductDetailView } from "@/modules/storefront/components/product-detail-view";
import { StorefrontNav } from "@/modules/storefront/components/storefront-nav";

// Título estático: la ficha resuelve en cliente, así que no hay producto que
// leer en el servidor para una `generateMetadata` dinámica. Indexar por
// producto exige SSR y va en su propio spec.
export const metadata: Metadata = {
  title: "Producto — tech.",
  description:
    "Ficha de producto: precio, disponibilidad y detalle del catálogo de tecnología.",
};

/** Ficha de producto. Server Component que solo compone: nav, isla y carrito. */
export default async function ProductDetailPage({
  params,
}: PageProps<"/products/[slug]">) {
  const { slug } = await params;

  return (
    <div className="flex flex-1 flex-col gap-3.5 px-4 pt-5 pb-27 lg:gap-5 lg:p-8">
      <StorefrontNav />

      <ProductDetailView slug={slug} />

      <CartDrawer />
    </div>
  );
}
