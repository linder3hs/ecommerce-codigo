import type { Metadata } from "next";

import { ProductsView } from "@/modules/products/components/products-view";

export const metadata: Metadata = {
  title: "Productos",
  description: "Administración de productos del catálogo.",
};

export default function ProductsPage() {
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Productos</h1>
        <p className="text-muted-foreground text-sm">
          Crea, edita y elimina los productos del catálogo.
        </p>
      </header>
      <ProductsView />
    </div>
  );
}
