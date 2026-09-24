import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { getEffectivePermissions, PERMISSIONS } from "@/lib/permissions";
import { ExpensesView } from "@/modules/finance/components/expenses-view";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Egresos",
  description:
    "Gastos operativos de la tienda: envíos, marketing, planilla y comisiones.",
};

export default async function AdminExpensesPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  // El layout ya validó `panel.access`; aquí se resuelve qué puede hacer esta
  // persona dentro de la pantalla. La barrera real sigue siendo
  // `requirePermission` en cada Route Handler.
  const permissions = await getEffectivePermissions(userId);

  if (!permissions.includes(PERMISSIONS.EXPENSES_VIEW)) {
    redirect("/admin/categories");
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Egresos</h1>
        <p className="text-sm text-muted-foreground">
          Gastos operativos de la tienda. El costo de la mercadería no se
          registra aquí: sale del costo de cada producto vendido.
        </p>
      </header>
      <ExpensesView
        canCreate={permissions.includes(PERMISSIONS.EXPENSES_CREATE)}
        canUpdate={permissions.includes(PERMISSIONS.EXPENSES_UPDATE)}
        canDelete={permissions.includes(PERMISSIONS.EXPENSES_DELETE)}
      />
    </div>
  );
}
