import { cn } from "@/lib/utils";
import { TAG } from "@/modules/storefront/lib/styles";

import type { OrderStatus } from "@/modules/checkout/types/order";

// `pending` nunca llega al historial —la API la excluye— pero el mapa cubre el
// enum completo para que agregar un estado sea un error de tipos y no una
// etiqueta vacía en pantalla.
const LABELS: Record<OrderStatus, string> = {
  pending: "Pago pendiente",
  paid: "Pagada",
  payment_failed: "Pago rechazado",
};

/**
 * Estado de la compra. Se dibuja en la fila y en el detalle: una compra
 * rechazada tiene que decirlo en los dos lugares o la persona cree que pagó.
 */
export function PurchaseStatusTag({ status }: { status: OrderStatus }) {
  return (
    <span
      className={cn(
        TAG,
        status === "paid" && "bg-brand text-on-brand",
        status === "payment_failed" && "text-ink",
      )}
    >
      {LABELS[status]}
    </span>
  );
}
