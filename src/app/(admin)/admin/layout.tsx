import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { AdminSidebar } from "@/components/shared/admin-sidebar";
import { getEffectivePermissions, PERMISSIONS } from "@/lib/permissions";

/**
 * Capa 2 de 3: gate de autorización del panel. Resuelve los permisos efectivos
 * una sola vez por navegación y los baja al sidebar, en lugar de que cada
 * página los vuelva a pedir. La capa que manda sigue siendo `requirePermission`
 * en cada Route Handler: esto solo decide qué se renderiza.
 *
 * Se usa `auth()` y no `requireAuth()` porque aquí la respuesta a "no hay
 * sesión" es una redirección, no un 401 de API.
 */
export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  const permissions = await getEffectivePermissions(userId);

  // `panel.access` es la llave del panel, no "tener algún permiso": `employee` y
  // `audit` tienen permisos y aun así no entran. Un usuario cuyo webhook
  // `user.created` aún no llegó cae por aquí con el set vacío, que es el
  // comportamiento seguro.
  if (!permissions.includes(PERMISSIONS.PANEL_ACCESS)) {
    redirect("/profile");
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col md:flex-row">
      <AdminSidebar permissions={permissions} />
      <main className="min-w-0 flex-1 p-4 md:p-8">{children}</main>
    </div>
  );
}
