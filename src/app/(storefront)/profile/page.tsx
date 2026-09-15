import { currentUser } from "@clerk/nextjs/server";
import { Heart } from "lucide-react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getCurrentAppUser } from "@/lib/auth";
import { CartDrawer } from "@/modules/cart/components/cart-drawer";
import { PurchaseHistory } from "@/modules/orders/components/purchase-history";
import { PaymentMethodList } from "@/modules/payment-methods/components/payment-method-list";
import { ProfileAccountCard } from "@/modules/storefront/components/profile-account-card";
import { ProfileEmpty } from "@/modules/storefront/components/profile-empty";
import { ProfileTabs } from "@/modules/storefront/components/profile-tabs";
import { StorefrontNav } from "@/modules/storefront/components/storefront-nav";
import { profileTabSchema } from "@/modules/storefront/lib/profile";
import { roleRepository } from "@/server/repositories/role.repository";

export const metadata: Metadata = {
  title: "Mi perfil — tech.",
};

// `timeZone: "UTC"` fija el día: sin él, servidor y navegador podrían formatear
// el mismo instante como dos fechas distintas y React marcaría desajuste.
const memberSinceFormatter = new Intl.DateTimeFormat("es-PE", {
  timeZone: "UTC",
  day: "2-digit",
  month: "long",
  year: "numeric",
});

/**
 * Perfil del cliente. Server Component: los tres datos que muestra —usuario de
 * Clerk y rol local— son lectura inicial sin interacción, así que van directos
 * al repositorio en vez de dar el rodeo hook → service → API (`docs/SETUP.md` §3).
 * La sección activa vive en la URL, no en estado.
 */
export default async function ProfilePage({
  searchParams,
}: PageProps<"/profile">) {
  const [{ tab, setup }, user] = await Promise.all([
    searchParams,
    currentUser(),
  ]);

  // `proxy.ts` ya exige sesión; esto cubre el caso de que la ruta salga del
  // matcher y evita renderizar un perfil sin dueño.
  if (!user) {
    redirect("/sign-in");
  }

  // Puede ser `null` si el webhook `user.created` aún no llegó: Svix es
  // asíncrono. La vista se degrada al rol por defecto en vez de romper.
  const appUser = await getCurrentAppUser();
  const role = appUser ? await roleRepository.findByUserId(appUser.id) : null;

  const active = profileTabSchema.parse(tab);

  return (
    <div className="flex flex-1 flex-col gap-3.5 px-4 pt-5 pb-27 lg:gap-5 lg:p-8">
      <StorefrontNav />

      <main className="flex flex-col gap-3.5 lg:gap-5">
        <h1 className="text-[26px] font-semibold tracking-[-0.03em] lg:text-[32px]">
          Mi cuenta
        </h1>

        <ProfileTabs active={active} />

        {active === "profile" ? (
          <ProfileAccountCard
            imageUrl={user.imageUrl}
            fullName={user.fullName ?? "Sin nombre"}
            email={user.primaryEmailAddress?.emailAddress ?? "Sin email"}
            memberSince={memberSinceFormatter.format(user.createdAt)}
            roleName={role ? role.name : "Cliente"}
          />
        ) : null}

        {active === "favorites" ? (
          <ProfileEmpty
            icon={Heart}
            title="Todavía no guardaste favoritos"
            description="Cuando marques un producto como favorito, lo vas a encontrar acá."
          />
        ) : null}

        {active === "orders" ? <PurchaseHistory /> : null}

        {active === "payment-methods" ? (
          // El retorno de Stripe solo dispara un refetch: quien confirma el
          // alta es el webhook, no esta query string.
          <PaymentMethodList justAdded={setup === "success"} />
        ) : null}
      </main>

      <CartDrawer />
    </div>
  );
}
