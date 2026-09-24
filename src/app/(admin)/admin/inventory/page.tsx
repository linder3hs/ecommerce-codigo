import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { getEffectivePermissions, PERMISSIONS } from "@/lib/permissions";
import { InventoryView } from "@/modules/products/components/inventory-view";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Inventario",
  description: "Stock del catálogo y ajuste rápido por delta.",
};

export default async function AdminInventoryPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  // El layout ya validó `panel.access`; aquí se resuelve qué puede ver esta
  // persona dentro de la pantalla. La barrera real sigue siendo
  // `requirePermission` en cada Route Handler.
  const permissions = await getEffectivePermissions(userId);

  if (!permissions.includes(PERMISSIONS.PRODUCTS_READ)) {
    redirect("/admin/categories");
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Inventario</h1>
        <p className="text-muted-foreground text-sm">
          Stock de todo el catálogo, con los faltantes primero. El ajuste suma o
          resta sobre el valor actual y queda registrado en auditoría.
        </p>
      </header>
      <InventoryView
        canAdjust={permissions.includes(PERMISSIONS.PRODUCTS_UPDATE)}
      />
    </div>
  );
}
