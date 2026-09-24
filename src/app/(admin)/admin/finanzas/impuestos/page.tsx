import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { getEffectivePermissions, PERMISSIONS } from "@/lib/permissions";
import { TaxView } from "@/modules/finance/components/tax-view";
import { IGV_PERCENT } from "@/modules/finance/lib/tax";
import { currentMonthRange } from "@/modules/orders/lib/date-range";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Impuestos",
  description: "IGV contenido en las ventas pagadas, por mes o trimestre.",
};

export default async function AdminTaxPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  // El layout ya validó `panel.access`; aquí se decide si esta persona puede
  // ver impuestos. La barrera real sigue siendo `requirePermission` en el
  // Route Handler.
  const permissions = await getEffectivePermissions(userId);

  if (!permissions.includes(PERMISSIONS.TAX_VIEW)) {
    redirect("/admin/categories");
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Impuestos</h1>
        <p className="text-sm text-muted-foreground">
          IGV ({IGV_PERCENT} %) contenido en las órdenes pagadas del rango. Es
          débito fiscal informativo: no resta crédito fiscal ni notas de
          crédito. Los días se cuentan con la hora de Lima.
        </p>
      </header>
      <TaxView initialRange={currentMonthRange()} />
    </div>
  );
}
