import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { getEffectivePermissions, PERMISSIONS } from "@/lib/permissions";
import { UnitPriceView } from "@/modules/finance/components/unit-price-view";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Precio unitario",
  description: "Precio, costo y margen de cada producto del catálogo.",
};

export default async function AdminUnitPricePage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  // El layout ya validó `panel.access`; aquí se resuelve qué puede ver esta
  // persona dentro de la pantalla. La barrera real sigue siendo
  // `requirePermission` en cada Route Handler.
  const permissions = await getEffectivePermissions(userId);

  // El gate es `product_cost.view` y no `products.read`: lo que protege esta
  // pantalla es el costo, no el catálogo (AC6).
  if (!permissions.includes(PERMISSIONS.PRODUCT_COST_VIEW)) {
    redirect("/admin/categories");
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          Precio unitario
        </h1>
        <p className="text-muted-foreground text-sm">
          Precio de venta, costo y margen de cada producto. Editar el costo
          queda registrado en auditoría y no altera las ventas ya cerradas.
        </p>
      </header>
      <UnitPriceView
        canEditCost={permissions.includes(PERMISSIONS.PRODUCT_COST_UPDATE)}
      />
    </div>
  );
}
