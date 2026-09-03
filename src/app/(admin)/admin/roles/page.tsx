import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { getEffectivePermissions, PERMISSIONS } from "@/lib/permissions";
import { RolesView } from "@/modules/roles/components/roles-view";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Roles y permisos",
  description: "Matriz de permisos por rol del sistema.",
};

export default async function RolesPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  // El layout ya validó `panel.access`; aquí se resuelve qué puede hacer esta
  // persona dentro de la pantalla. La barrera real sigue siendo
  // `requirePermission` en cada Route Handler.
  const permissions = await getEffectivePermissions(userId);

  if (!permissions.includes(PERMISSIONS.ROLES_READ)) {
    redirect("/admin/categories");
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          Roles y permisos
        </h1>
        <p className="text-sm text-muted-foreground">
          Revisa qué puede hacer cada rol del sistema y ajusta sus permisos.
        </p>
      </header>
      <RolesView
        canManagePermissions={permissions.includes(
          PERMISSIONS.ROLES_MANAGE_PERMISSIONS,
        )}
      />
    </div>
  );
}
