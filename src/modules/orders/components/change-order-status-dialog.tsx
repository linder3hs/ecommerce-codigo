"use client";

import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import { ORDER_STATUS_LABELS } from "../constants";
import { useUpdateOrderStatus } from "../hooks/use-update-order-status";

import type { OrderStatus } from "@/modules/checkout/types/order";

import type { AdminOrderDetail } from "../types/admin-order";

type ChangeOrderStatusDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** La orden tal como se leyó: su `status` es el `expectedStatus` del PATCH. */
  order: AdminOrderDetail;
  nextStatus: OrderStatus;
};

/**
 * Confirmación del cambio manual de estado. Manda `expectedStatus` con el estado
 * que el admin tenía en pantalla: si el webhook de Stripe movió la orden entre
 * medio, el servidor responde 409 y aquí solo se muestra su mensaje —el
 * interceptor de `@/lib/axios` ya lo trae legible— sin haber escrito nada.
 */
export function ChangeOrderStatusDialog({
  open,
  onOpenChange,
  order,
  nextStatus,
}: ChangeOrderStatusDialogProps) {
  const updateStatus = useUpdateOrderStatus();

  function handleConfirm() {
    updateStatus.mutate(
      {
        id: order.id,
        input: { status: nextStatus, expectedStatus: order.status },
      },
      {
        onSuccess: () => {
          toast.success(
            `La orden de ${order.customer.email} quedó como ${ORDER_STATUS_LABELS[nextStatus]}.`,
          );
          onOpenChange(false);
        },
        // El diálogo queda abierto a propósito: con el 409 el admin lee el
        // motivo y decide, en vez de perder el contexto de lo que confirmaba.
        onError: (error: Error) => toast.error(error.message),
      },
    );
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            ¿Pasar la orden a {ORDER_STATUS_LABELS[nextStatus]}?
          </AlertDialogTitle>
          <AlertDialogDescription>
            Ahora está como {ORDER_STATUS_LABELS[order.status]}. El cambio queda
            registrado en auditoría con tu usuario. No notifica al cliente, no
            toca el cobro en Stripe y no mueve el stock.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={updateStatus.isPending}>
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction
            disabled={updateStatus.isPending}
            onClick={(event) => {
              event.preventDefault();
              handleConfirm();
            }}
          >
            {updateStatus.isPending ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : null}
            Cambiar estado
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
