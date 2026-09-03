import type { Metadata } from "next";

import { CategoriesView } from "@/modules/categories/components/categories-view";

export const metadata: Metadata = {
  title: "Categorías",
  description: "Administración de categorías del catálogo.",
};

export default function CategoriesPage() {
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Categorías</h1>
        <p className="text-sm text-muted-foreground">
          Crea, edita y elimina las categorías del catálogo.
        </p>
      </header>
      <CategoriesView />
    </div>
  );
}
