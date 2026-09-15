import Link from "next/link";

import { cn } from "@/lib/utils";

import { CATALOG_PATH } from "../lib/catalog";
import { CARD, CIRC, PILL, PILL_QUIET } from "../lib/styles";

import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

type ProfileEmptyProps = {
  icon: LucideIcon;
  title: string;
  description: string;
  /**
   * CTA propio de la sección. Reemplaza el enlace al catálogo cuando el
   * siguiente paso útil no es comprar —ampliar un filtro, por ejemplo—.
   */
  action?: ReactNode;
};

/**
 * Vacío de favoritos y compras. Sin `action`, el CTA es el catálogo: desde una
 * sección sin datos el siguiente paso por defecto es ir a comprar.
 */
export function ProfileEmpty({
  icon: Icon,
  title,
  description,
  action,
}: ProfileEmptyProps) {
  return (
    <section
      className={cn(
        CARD,
        "flex flex-col items-center gap-2 px-10 py-20 text-center lg:py-24",
      )}
    >
      <span className={cn(CIRC, "text-ink-muted size-14")}>
        <Icon aria-hidden className="size-6" />
      </span>
      <h2 className="mt-2 text-[16px] font-medium">{title}</h2>
      <p className="text-ink-muted max-w-[38ch] text-[13.5px]">{description}</p>
      {action ?? (
        <Link
          href={CATALOG_PATH}
          className={cn(PILL, PILL_QUIET, "mt-3 h-11 px-5 text-[14px]")}
        >
          Ver catálogo
        </Link>
      )}
    </section>
  );
}
