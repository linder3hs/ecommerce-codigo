import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { getEffectivePermissions, PERMISSIONS } from "@/lib/permissions";
import { DashboardView } from "@/modules/dashboard/components/dashboard-view";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Ventas, órdenes por estado y productos con stock bajo.",
};

export default async function DashboardPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  // El layout ya validó `panel.access`; aquí se resuelve qué puede ver esta
  // persona dentro de la pantalla. La barrera real sigue siendo
  // `requirePermission` en cada Route Handler.
  const permissions = await getEffectivePermissions(userId);

  if (!permissions.includes(PERMISSIONS.METRICS_READ)) {
    redirect("/admin/categories");
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground text-sm">
          Foto de los últimos 30 días. Los datos se refrescan solos cada 30
          segundos.
        </p>
      </header>
      <DashboardView />
    </div>
  );
}
