"use client";

import { Package, ScrollText, ShieldCheck, Tags, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

import type { PermissionCode } from "@/lib/permissions";
import type { LucideIcon } from "lucide-react";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  // Sin `requiredPermission` el ítem se muestra siempre. Es un filtro de ruido
  // visual, no una barrera: quien fuerce la URL se topa con el gate del layout
  // y con `requirePermission` en el handler.
  requiredPermission?: PermissionCode;
};

// `PermissionCode` es una unión cerrada de literales: un código mal escrito no
// compila. El catálogo `PERMISSIONS` no se importa aquí porque vive en un
// módulo `server-only` y este componente corre en el cliente.
const NAV_ITEMS: readonly NavItem[] = [
  {
    href: "/admin/categories",
    label: "Categorías",
    icon: Tags,
    requiredPermission: "categories.read",
  },
  {
    href: "/admin/products",
    label: "Productos",
    icon: Package,
    requiredPermission: "products.read",
  },
  // El módulo y la ruta se llaman `customers`, pero el recurso de permisos es
  // `users.*` y la etiqueta que ve la persona es "Usuarios".
  {
    href: "/admin/customers",
    label: "Usuarios",
    icon: Users,
    requiredPermission: "users.read",
  },
  {
    href: "/admin/roles",
    label: "Roles y permisos",
    icon: ShieldCheck,
    requiredPermission: "roles.read",
  },
  {
    href: "/admin/audit-logs",
    label: "Auditoría",
    icon: ScrollText,
    requiredPermission: "audit_logs.read",
  },
];

type AdminSidebarProps = {
  permissions: readonly PermissionCode[];
};

export function AdminSidebar({ permissions }: AdminSidebarProps) {
  const pathname = usePathname();

  const visibleItems = NAV_ITEMS.filter(
    (item) =>
      item.requiredPermission === undefined ||
      permissions.includes(item.requiredPermission),
  );

  return (
    <aside className="bg-card w-full shrink-0 border-b md:h-full md:w-60 md:border-r md:border-b-0">
      <div className="p-4">
        <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
          Administración
        </p>
      </div>
      <nav aria-label="Navegación de administración" className="px-2 pb-4">
        <ul className="flex flex-col gap-1">
          {visibleItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            const Icon = item.icon;

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
                    isActive
                      ? "bg-accent text-accent-foreground font-medium"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                  )}
                >
                  <Icon className="size-4" aria-hidden />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
