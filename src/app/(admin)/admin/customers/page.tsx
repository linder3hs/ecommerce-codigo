import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { getEffectivePermissions, PERMISSIONS } from "@/lib/permissions";
import { CustomersView } from "@/modules/customers/components/customers-view";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Usuarios",
  description: "Personas con acceso a la aplicación y su rol.",
};

export default async function CustomersPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  // El layout ya validó `panel.access`; aquí se resuelve qué puede hacer esta
  // persona dentro de la pantalla. La barrera real sigue siendo
  // `requirePermission` en cada Route Handler.
  const permissions = await getEffectivePermissions(userId);

  if (!permissions.includes(PERMISSIONS.USERS_READ)) {
    redirect("/admin/categories");
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Usuarios</h1>
        <p className="text-muted-foreground text-sm">
          Invita a nuevas personas, ajusta su rol y controla quién tiene acceso.
        </p>
      </header>
      <CustomersView
        capabilities={{
          canInvite: permissions.includes(PERMISSIONS.USERS_CREATE),
          canUpdateRole: permissions.includes(PERMISSIONS.USERS_UPDATE),
          canDeactivate: permissions.includes(PERMISSIONS.USERS_DEACTIVATE),
        }}
      />
    </div>
  );
}
