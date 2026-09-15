import { UserProfile } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { getCurrentAppUser } from "@/lib/auth";
import { roleRepository } from "@/server/repositories/role.repository";

export const metadata: Metadata = {
  title: "Gestionar cuenta",
};

/**
 * Autogestión para cualquier usuario autenticado, tenga o no acceso al panel:
 * es el destino de quien no pasa el gate de `/admin`.
 *
 * Lectura inicial directa del repositorio (Server Component → repositorio),
 * el patrón de `docs/SETUP.md`: no hay interacción sobre este dato, así que un
 * hook + service solo añadiría un salto de red.
 */
export default async function AccountPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  // Puede ser `null` si el webhook `user.created` aún no llegó: Svix es
  // asíncrono. La página sigue siendo útil sin la fila local, así que se
  // degrada en vez de romper.
  const user = await getCurrentAppUser();
  const role = user ? await roleRepository.findByUserId(user.id) : null;

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-4 md:p-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Mi cuenta</h1>
          <p className="text-muted-foreground text-sm">
            Actualiza tus datos de acceso y tu seguridad.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-sm">Rol</span>
          {/* Solo lectura: el rol se cambia desde la administración de usuarios. */}
          <Badge variant="secondary">{role ? role.name : "Cliente"}</Badge>
        </div>
      </header>

      <UserProfile routing="hash" />
    </main>
  );
}
