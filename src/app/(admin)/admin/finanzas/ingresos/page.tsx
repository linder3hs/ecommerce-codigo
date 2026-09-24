import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { getEffectivePermissions, PERMISSIONS } from "@/lib/permissions";
import { RevenueView } from "@/modules/finance/components/revenue-view";
import { currentMonthRange } from "@/modules/orders/lib/date-range";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Ingresos",
  description:
    "Ingreso neto y bruto de las órdenes pagadas por rango de fechas.",
};

export default async function AdminRevenuePage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  // El layout ya validó `panel.access`; aquí se decide si esta persona puede
  // ver ingresos. La barrera real sigue siendo `requirePermission` en el
  // Route Handler.
  const permissions = await getEffectivePermissions(userId);

  if (!permissions.includes(PERMISSIONS.REVENUE_VIEW)) {
    redirect("/admin/categories");
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Ingresos</h1>
        <p className="text-sm text-muted-foreground">
          Ingreso neto (sin IGV) y bruto de las órdenes pagadas en el rango. Los
          días se cuentan con la hora de Lima y la fecha de cada venta es la de
          creación de la orden.
        </p>
      </header>
      <RevenueView initialRange={currentMonthRange()} />
    </div>
  );
}
