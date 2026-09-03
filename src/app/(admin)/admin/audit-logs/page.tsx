import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { getEffectivePermissions, PERMISSIONS } from "@/lib/permissions";
import { AuditLogsView } from "@/modules/audit/components/audit-logs-view";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Auditoría",
  description: "Registro de acciones sensibles del panel de administración.",
};

export default async function AuditLogsPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  // El layout ya validó `panel.access`; aquí se resuelve qué puede ver esta
  // persona dentro de la pantalla. La barrera real sigue siendo
  // `requirePermission` en cada Route Handler.
  const permissions = await getEffectivePermissions(userId);

  if (!permissions.includes(PERMISSIONS.AUDIT_LOGS_READ)) {
    redirect("/admin/categories");
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Auditoría</h1>
        <p className="text-muted-foreground text-sm">
          Quién hizo qué y cuándo. El registro es de solo lectura: no se edita ni
          se borra desde la aplicación.
        </p>
      </header>
      <AuditLogsView
        canReadMetrics={permissions.includes(PERMISSIONS.METRICS_READ)}
      />
    </div>
  );
}
