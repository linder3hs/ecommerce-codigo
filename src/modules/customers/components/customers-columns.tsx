import {
  createColumnHelper,
  rowPaginationFeature,
  tableFeatures,
} from "@tanstack/react-table";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { formatCustomerName } from "@/lib/format";

import { CustomerRowActions } from "./customer-row-actions";
import { UserStatusBadge } from "./user-status-badge";

import type { UserCapabilities, UserListItem } from "../types/user";

// Sin `rowSortingFeature`: el listado de usuarios ordena siempre por fecha de
// alta descendente en el repositorio, no hay orden configurable que exponer.
export const customersTableFeatures = tableFeatures({ rowPaginationFeature });

const dateFormatter = new Intl.DateTimeFormat("es", { dateStyle: "medium" });

const helper = createColumnHelper<typeof customersTableFeatures, UserListItem>();

function initials(user: UserListItem): string {
  const name = formatCustomerName(user, null);

  if (name) {
    return name
      .split(" ")
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join("");
  }

  return user.email.charAt(0).toUpperCase();
}

/**
 * Las columnas dependen de lo que esta persona puede hacer, así que se
 * construyen por vista en lugar de vivir en el ámbito del módulo. El consumidor
 * las memoiza.
 */
export function createCustomersColumns(capabilities: UserCapabilities) {
  return helper.columns([
    helper.accessor("email", {
      header: "Usuario",
      cell: (info) => {
        const user = info.row.original;
        // `null` como fallback: sin nombre la fila muestra el email arriba.
        const name = formatCustomerName(user, null);

        return (
          <div className="flex items-center gap-3">
            <Avatar className="size-9 shrink-0">
              {user.imageUrl ? (
                <AvatarImage src={user.imageUrl} alt="" />
              ) : null}
              <AvatarFallback>{initials(user)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate font-medium">{name ?? user.email}</p>
              {name ? (
                <p className="text-muted-foreground truncate text-xs">
                  {user.email}
                </p>
              ) : null}
            </div>
          </div>
        );
      },
    }),
    helper.accessor("role", {
      header: "Rol",
      cell: (info) => {
        const role = info.getValue();

        // Sin fila en `user_roles` el usuario es cliente por defecto: ese
        // default lo resuelve `getEffectivePermissions()` en el servidor.
        return (
          <Badge variant={role ? "secondary" : "outline"}>
            {role ? role.name : "Cliente"}
          </Badge>
        );
      },
    }),
    helper.accessor("isActive", {
      header: "Estado",
      cell: (info) => <UserStatusBadge isActive={info.getValue()} />,
    }),
    helper.accessor("createdAt", {
      header: "Alta",
      cell: (info) => (
        <span className="text-muted-foreground text-sm">
          {dateFormatter.format(new Date(info.getValue()))}
        </span>
      ),
    }),
    helper.display({
      id: "actions",
      header: "",
      cell: (info) => (
        <div className="flex justify-end">
          <CustomerRowActions
            user={info.row.original}
            capabilities={capabilities}
          />
        </div>
      ),
    }),
  ]);
}
