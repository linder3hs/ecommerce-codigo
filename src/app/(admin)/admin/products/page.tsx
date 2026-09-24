import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { getEffectivePermissions, PERMISSIONS } from "@/lib/permissions";
import { ProductsView } from "@/modules/products/components/products-view";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Productos",
  description: "Administración de productos del catálogo.",
};

export default async function ProductsPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  // Solo para decidir si el formulario muestra el campo Costo: el gate de la
  // pantalla lo hace el layout con `panel.access` y la barrera real es
  // `requirePermission` en cada Route Handler.
  const permissions = await getEffectivePermissions(userId);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Productos</h1>
        <p className="text-muted-foreground text-sm">
          Crea, edita y elimina los productos del catálogo.
        </p>
      </header>
      <ProductsView
        canEditCost={permissions.includes(PERMISSIONS.PRODUCT_COST_UPDATE)}
      />
    </div>
  );
}
