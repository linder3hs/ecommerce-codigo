"use client";

import { TriangleAlert } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCents, formatCustomerName } from "@/lib/format";
import { ORDER_STATUSES } from "@/modules/dashboard/constants";

import { ORDER_STATUS_LABELS } from "../constants";
import { useAdminOrder } from "../hooks/use-admin-orders";

import { ChangeOrderStatusDialog } from "./change-order-status-dialog";

import type { OrderStatus } from "@/modules/checkout/types/order";

import type { AdminOrderDetail } from "../types/admin-order";

// Segunda copia del mapa de variantes de `admin-orders-columns.tsx`: son dos
// usos, todavía por debajo del umbral para extraer un componente compartido.
const STATUS_VARIANTS: Record<
  OrderStatus,
  "outline" | "secondary" | "destructive"
> = {
  pending: "outline",
  paid: "secondary",
  payment_failed: "destructive",
};

const dateTimeFormatter = new Intl.DateTimeFormat("es", {
  dateStyle: "long",
  timeStyle: "short",
});

/**
 * Control del cambio de estado. Solo se monta con `orders.update_status`: sin el
 * permiso el diálogo es de lectura (AC5). La barrera real no es esta: el handler
 * vuelve a comprobar el permiso y responde 403.
 */
function OrderStatusControl({ order }: { order: AdminOrderDetail }) {
  const [nextStatus, setNextStatus] = useState<OrderStatus>(order.status);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  // El handler responde 400 si el estado nuevo es el actual: se bloquea antes.
  const isUnchanged = nextStatus === order.status;

  return (
    <div className="flex flex-col gap-1.5 border-t pt-4 sm:flex-row sm:items-end sm:gap-3">
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <Label htmlFor="admin-order-next-status">Cambiar estado</Label>
        <Select
          value={nextStatus}
          onValueChange={(value) => setNextStatus(value as OrderStatus)}
        >
          <SelectTrigger id="admin-order-next-status" className="sm:w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {/* `ORDER_STATUSES` y no `ORDER_STATUS_OPTIONS`: ese lleva el
                centinela "todos" del filtro, que no es un estado válido. */}
            {ORDER_STATUSES.map((status) => (
              <SelectItem key={status} value={status}>
                {ORDER_STATUS_LABELS[status]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Button disabled={isUnchanged} onClick={() => setIsConfirmOpen(true)}>
        Aplicar
      </Button>

      {isConfirmOpen ? (
        <ChangeOrderStatusDialog
          open
          onOpenChange={setIsConfirmOpen}
          order={order}
          nextStatus={nextStatus}
        />
      ) : null}
    </div>
  );
}

function OrderLines({ order }: { order: AdminOrderDetail }) {
  return (
    <div className="overflow-hidden rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Producto</TableHead>
            <TableHead className="text-right">Cantidad</TableHead>
            <TableHead className="text-right">Precio unitario</TableHead>
            <TableHead className="text-right">Subtotal</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {order.items.map((item) => (
            <TableRow key={item.id}>
              <TableCell className="font-medium">
                {/* Nombre y precio del snapshot de la compra, no del catálogo:
                    si el producto cambió hoy, la orden sigue siendo un hecho. */}
                {item.nameSnapshot}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {item.qty}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {formatCents(item.unitPriceCents)}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {formatCents(item.unitPriceCents * item.qty)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell colSpan={3} className="font-medium">
              Total
            </TableCell>
            <TableCell className="text-right font-semibold tabular-nums">
              {formatCents(order.totalCents)}
            </TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    </div>
  );
}

function OrderDetailBody({
  order,
  canUpdateStatus,
}: {
  order: AdminOrderDetail;
  canUpdateStatus: boolean;
}) {
  return (
    <div className="flex flex-col gap-4">
      <dl className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-0.5">
          <dt className="text-muted-foreground text-xs">Cliente</dt>
          <dd className="text-sm">
            {formatCustomerName(order.customer, "Sin nombre")}
            <span className="text-muted-foreground block break-words">
              {order.customer.email}
            </span>
          </dd>
        </div>
        <div className="grid gap-0.5">
          <dt className="text-muted-foreground text-xs">Estado</dt>
          <dd>
            <Badge variant={STATUS_VARIANTS[order.status]}>
              {ORDER_STATUS_LABELS[order.status]}
            </Badge>
          </dd>
        </div>
      </dl>

      <OrderLines order={order} />

      {canUpdateStatus ? <OrderStatusControl order={order} /> : null}
    </div>
  );
}

type AdminOrderDetailDialogProps = {
  /** `""` mientras no hay orden elegida: el hook del detalle no consulta nada. */
  orderId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canUpdateStatus: boolean;
};

/**
 * Detalle de una orden del panel. `Dialog` y no `AlertDialog`: es informativo y
 * la única acción —el cambio de estado— tiene su propia confirmación encima.
 */
export function AdminOrderDetailDialog({
  orderId,
  open,
  onOpenChange,
  canUpdateStatus,
}: AdminOrderDetailDialogProps) {
  const order = useAdminOrder(orderId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Radix bloquea el scroll del body mientras está abierto: sin `max-h` una
          orden de muchas líneas dejaría el total fuera de pantalla. */}
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            Orden {orderId ? `#${orderId.slice(0, 8)}` : ""}
          </DialogTitle>
          <DialogDescription>
            {order.data
              ? dateTimeFormatter.format(new Date(order.data.createdAt))
              : "Cargando el detalle de la orden…"}
          </DialogDescription>
        </DialogHeader>

        {order.isPending ? (
          <div className="flex flex-col gap-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : order.isError ? (
          <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed p-8 text-center">
            <TriangleAlert className="text-destructive size-6" aria-hidden />
            <div>
              <p className="font-medium">No se pudo cargar la orden.</p>
              <p className="text-muted-foreground text-sm">
                {order.error.message}
              </p>
            </div>
            <Button variant="outline" onClick={() => void order.refetch()}>
              Reintentar
            </Button>
          </div>
        ) : (
          <OrderDetailBody
            order={order.data}
            canUpdateStatus={canUpdateStatus}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
