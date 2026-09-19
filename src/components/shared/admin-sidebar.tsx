"use client";

import { SignOutButton } from "@clerk/nextjs";
import {
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  PackageSearch,
  ScrollText,
  ShieldCheck,
  ShoppingCart,
  Tags,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
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
    href: "/admin/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    requiredPermission: "metrics.read",
  },
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
  // Vive junto a Productos porque es otra vista del mismo recurso
  // (`products.*`), no una sección nueva.
  {
    href: "/admin/inventory",
    label: "Inventario",
    icon: PackageSearch,
    requiredPermission: "products.read",
  },
  {
    href: "/admin/orders",
    label: "Órdenes",
    icon: ShoppingCart,
    requiredPermission: "orders.read",
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

type AdminNavProps = {
  items: readonly NavItem[];
  pathname: string;
  // Solo lo pasa la variante mobile: navegar dentro del Sheet no lo desmonta y
  // la hoja quedaría abierta sobre la página recién abierta.
  onNavigate?: () => void;
};

function AdminNav({ items, pathname, onNavigate }: AdminNavProps) {
  return (
    <nav
      aria-label="Navegación de administración"
      className="min-h-0 flex-1 overflow-y-auto px-2 pb-4"
    >
      <ul className="flex flex-col gap-1">
        {items.map((item) => {
          const isActive = pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <li key={item.href}>
              <Link
                href={item.href}
                onClick={onNavigate}
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
  );
}

/**
 * Cierre de sesión delegado a Clerk: el botón solo aporta el estilo, la
 * revocación de la sesión y la limpieza de cookies las hace `SignOutButton`.
 */
function AdminSignOut() {
  return (
    <div className="border-t p-2">
      <SignOutButton redirectUrl="/">
        <Button
          type="button"
          variant="ghost"
          className="text-muted-foreground hover:text-accent-foreground h-9 w-full justify-start gap-2 px-3 text-sm"
        >
          <LogOut className="size-4" aria-hidden />
          Cerrar sesión
        </Button>
      </SignOutButton>
    </div>
  );
}

type AdminSidebarProps = {
  permissions: readonly PermissionCode[];
};

export function AdminSidebar({ permissions }: AdminSidebarProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const visibleItems = NAV_ITEMS.filter(
    (item) =>
      item.requiredPermission === undefined ||
      permissions.includes(item.requiredPermission),
  );

  return (
    <>
      <header className="bg-card sticky top-0 z-30 flex items-center gap-2 border-b px-3 py-2 md:hidden">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Abrir navegación">
              <Menu className="size-4" aria-hidden />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 gap-0 p-0 sm:max-w-72">
            <SheetHeader className="border-b">
              <SheetTitle className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                Administración
              </SheetTitle>
              <SheetDescription className="sr-only">
                Secciones del panel de administración
              </SheetDescription>
            </SheetHeader>
            <AdminNav
              items={visibleItems}
              pathname={pathname}
              onNavigate={() => setMobileOpen(false)}
            />
            <AdminSignOut />
          </SheetContent>
        </Sheet>
        <span className="text-sm font-medium">Administración</span>
      </header>

      <aside className="bg-card sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r md:flex">
        <div className="p-4">
          <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
            Administración
          </p>
        </div>
        <AdminNav items={visibleItems} pathname={pathname} />
        <AdminSignOut />
      </aside>
    </>
  );
}
