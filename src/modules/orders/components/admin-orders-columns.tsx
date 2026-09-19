import {
  createColumnHelper,
  rowPaginationFeature,
  tableFeatures,
} from "@tanstack/react-table";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCents, formatCustomerName } from "@/lib/format";

import { ORDER_STATUS_LABELS } from "../constants";

import type { OrderStatus } from "@/modules/checkout/types/order";

import type { AdminOrderListItem } from "../types/admin-order";

// Sin `rowSortingFeature`: el listado se lee siempre por fecha descendente, que
// es el orden que impone el repositorio. No hay orden configurable que exponer.
export const adminOrdersTableFeatures = tableFeatures({ rowPaginationFeature });

// Fecha y hora: varias órdenes del mismo día son lo normal y la hora es lo que
// las distingue cuando se compara con el registro de auditoría.
const dateTimeFormatter = new Intl.DateTimeFormat("es", {
  dateStyle: "medium",
  timeStyle: "short",
});

// `Record<OrderStatus, …>` para que un estado nuevo en el pgEnum sea un error de
// compilación y no una celda sin color.
const STATUS_VARIANTS: Record<
  OrderStatus,
  "outline" | "secondary" | "destructive"
> = {
  pending: "outline",
  paid: "secondary",
  payment_failed: "destructive",
};

const helper = createColumnHelper<
  typeof adminOrdersTableFeatures,
  AdminOrderListItem
>();

/**
 * Las columnas dependen del callback que abre el detalle, así que se construyen
 * por vista en lugar de vivir en el ámbito del módulo. El consumidor las
 * memoiza. La navegación no se decide acá: quién abre qué es de la vista.
 */
export function createAdminOrdersColumns(
  onView: (order: AdminOrderListItem) => void,
) {
  return helper.columns([
    helper.accessor((row) => row.customer.email, {
      id: "customer",
      header: "Cliente",
      cell: (info) => {
        const { customer } = info.row.original;

        return (
          <div className="min-w-0">
            <p className="truncate font-medium">
              {formatCustomerName(customer, "Sin nombre")}
            </p>
            <p className="text-muted-foreground truncate text-xs">
              {customer.email}
            </p>
          </div>
        );
      },
    }),
    helper.accessor("status", {
      header: "Estado",
      cell: (info) => {
        const status = info.getValue();

        return (
          <Badge variant={STATUS_VARIANTS[status]}>
            {ORDER_STATUS_LABELS[status]}
          </Badge>
        );
      },
    }),
    helper.accessor("totalCents", {
      header: "Total",
      cell: (info) => (
        <span className="font-medium tabular-nums">
          {formatCents(info.getValue())}
        </span>
      ),
    }),
    helper.accessor("createdAt", {
      header: "Fecha",
      cell: (info) => (
        <span className="text-muted-foreground text-sm whitespace-nowrap">
          {dateTimeFormatter.format(new Date(info.getValue()))}
        </span>
      ),
    }),
    helper.display({
      id: "actions",
      header: "",
      cell: (info) => {
        const order = info.row.original;

        return (
          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onView(order)}
              aria-label={`Ver la orden de ${formatCustomerName(
                order.customer,
                "Sin nombre",
              )}`}
            >
              Ver
            </Button>
          </div>
        );
      },
    }),
  ]);
}
