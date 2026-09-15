import Link from "next/link";

import { cn } from "@/lib/utils";

import {
  PROFILE_SECTIONS,
  profileTabHref,
  type ProfileTab,
} from "../lib/profile";
import { CHIP, CHIP_ON } from "../lib/styles";

/**
 * Secciones de `/profile`. Son enlaces, no botones: la sección activa vive en
 * la URL, así que no hay estado que guardar y el componente se queda en el
 * servidor. `aria-current` es lo que anuncia cuál está activa, el color solo
 * la dibuja.
 */
export function ProfileTabs({ active }: { active: ProfileTab }) {
  return (
    <nav aria-label="Secciones del perfil" className="flex flex-wrap gap-2">
      {PROFILE_SECTIONS.map((section) => {
        const isActive = section.id === active;
        const Icon = section.icon;

        return (
          <Link
            key={section.id}
            href={profileTabHref(section.id)}
            aria-current={isActive ? "page" : undefined}
            className={cn(CHIP, isActive && CHIP_ON)}
          >
            <Icon aria-hidden className="size-[15px]" />
            {section.label}
          </Link>
        );
      })}
    </nav>
  );
}
