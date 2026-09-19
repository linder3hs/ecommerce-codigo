import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { getEffectivePermissions, PERMISSIONS } from "@/lib/permissions";
import { AdminOrdersView } from "@/modules/orders/components/admin-orders-view";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Órdenes",
  description: "Listado, detalle y cambio de estado de las órdenes.",
};

export default async function AdminOrdersPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  // El layout ya validó `panel.access`; aquí se resuelve qué puede ver esta
  // persona dentro de la pantalla. La barrera real sigue siendo
  // `requirePermission` en cada Route Handler.
  const permissions = await getEffectivePermissions(userId);

  if (!permissions.includes(PERMISSIONS.ORDERS_READ)) {
    redirect("/admin/categories");
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Órdenes</h1>
        <p className="text-muted-foreground text-sm">
          Consulta cualquier orden de la tienda y corrige su estado. Las líneas y
          los importes no se editan: la orden es un hecho contable.
        </p>
      </header>
      <AdminOrdersView
        canUpdateStatus={permissions.includes(PERMISSIONS.ORDERS_UPDATE_STATUS)}
      />
    </div>
  );
}
