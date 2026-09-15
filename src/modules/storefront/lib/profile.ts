import { CreditCard, Heart, Receipt, UserRound } from "lucide-react";
import { z } from "zod";

import type { LucideIcon } from "lucide-react";

/**
 * Estado de `/profile`: la sección activa vive en la URL, no en React. El
 * `.catch()` hace que un `?tab=` escrito a mano nunca rompa la página: cae en
 * "Mi perfil" en vez de renderizar nada.
 */
export const profileTabSchema = z
  .enum(["profile", "favorites", "orders", "payment-methods"])
  .catch("profile");

export type ProfileTab = z.infer<typeof profileTabSchema>;

export const PROFILE_PATH = "/profile";

/** Widget de Clerk: sigue siendo el único lugar donde se editan los datos. */
export const PROFILE_ACCOUNT_PATH = "/profile/account";

type ProfileSection = {
  id: ProfileTab;
  label: string;
  icon: LucideIcon;
};

export const PROFILE_SECTIONS: readonly ProfileSection[] = [
  { id: "profile", label: "Mi perfil", icon: UserRound },
  { id: "favorites", label: "Mis favoritos", icon: Heart },
  { id: "orders", label: "Mis compras", icon: Receipt },
  { id: "payment-methods", label: "Métodos de pago", icon: CreditCard },
];

/** Href de una sección. La activa por defecto no escribe query string. */
export function profileTabHref(tab: ProfileTab): string {
  return tab === "profile" ? PROFILE_PATH : `${PROFILE_PATH}?tab=${tab}`;
}
