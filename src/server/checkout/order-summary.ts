import "server-only";

import type { OrderSummary } from "@/modules/checkout/types/order";
import type { OrderWithItemsRow } from "@/server/repositories/order.repository";

/**
 * Proyección de la orden para la página de retorno. Deja fuera `userId` y los
 * identificadores de Stripe: quien compra solo necesita saber en qué estado
 * quedó su compra y qué compró.
 *
 * Vive suelta porque los dos caminos de pago tienen su propia ruta de consulta
 * —por sesión de Checkout y por id de orden— y las dos deben responder
 * exactamente la misma forma.
 */
export function toOrderSummary(order: OrderWithItemsRow): OrderSummary {
  return {
    id: order.id,
    status: order.status,
    totalCents: order.totalCents,
    currency: order.currency,
    createdAt: order.createdAt.toISOString(),
    items: order.items.map((item) => ({
      id: item.id,
      productId: item.productId,
      nameSnapshot: item.nameSnapshot,
      unitPriceCents: item.unitPriceCents,
      qty: item.qty,
    })),
  };
}
