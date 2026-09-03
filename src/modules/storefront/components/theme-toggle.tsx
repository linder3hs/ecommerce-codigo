"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";

import { cn } from "@/lib/utils";

import { CIRC } from "../lib/styles";

// Suscripción vacía: el valor nunca cambia después de hidratar. Es la forma
// recomendada de preguntar "¿ya estamos en el cliente?" sin encadenar un
// `setState` dentro de un efecto.
const NEVER_CHANGES = () => () => {};

function useIsHydrated(): boolean {
  return useSyncExternalStore(
    NEVER_CHANGES,
    () => true,
    () => false,
  );
}

/**
 * Conmutador de tema. El icono solo se dibuja después de montar: en el servidor
 * no se sabe qué resolvió `system`, y pintarlo antes es el parpadeo —y el error
 * de hidratación— clásico de next-themes.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useIsHydrated();

  const isDark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? "Activar tema claro" : "Activar tema oscuro"}
      className={cn(CIRC, className)}
    >
      {mounted ? (
        isDark ? (
          <Sun aria-hidden className="size-[18px]" />
        ) : (
          <Moon aria-hidden className="size-[18px]" />
        )
      ) : (
        <span className="size-[18px]" />
      )}
    </button>
  );
}
