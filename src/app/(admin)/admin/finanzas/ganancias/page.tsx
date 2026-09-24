import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { getEffectivePermissions, PERMISSIONS } from "@/lib/permissions";
import { ProfitView } from "@/modules/finance/components/profit-view";
import { currentMonthRange } from "@/modules/orders/lib/date-range";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Ganancias",
  description:
    "Utilidad del periodo: ingreso neto menos costo de lo vendido y egresos.",
};

export default async function AdminProfitPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  // El layout ya validó `panel.access`; aquí se decide si esta persona puede
  // ver ganancias. La barrera real sigue siendo `requirePermission` en el
  // Route Handler.
  const permissions = await getEffectivePermissions(userId);

  if (!permissions.includes(PERMISSIONS.PROFIT_VIEW)) {
    redirect("/admin/categories");
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Ganancias</h1>
        <p className="text-sm text-muted-foreground">
          Utilidad = ingreso neto (sin IGV) − costo de lo vendido − egresos,
          solo con órdenes pagadas. Los días se cuentan con la hora de Lima; el
          costo es el registrado en cada venta.
        </p>
      </header>
      <ProfitView initialRange={currentMonthRange()} />
    </div>
  );
}
