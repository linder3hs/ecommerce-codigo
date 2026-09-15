import type { InferSelectModel } from "drizzle-orm";

// `import type`: se borra en compilación y drizzle-orm nunca llega al bundle
// del navegador.
import type { orderItems, orders } from "@/server/db/schema/order";

type OrderRow = InferSelectModel<typeof orders>;
type OrderItemRow = InferSelectModel<typeof orderItems>;

export type OrderStatus = OrderRow["status"];

export type OrderSummaryItem = Pick<
  OrderItemRow,
  "id" | "productId" | "nameSnapshot" | "unitPriceCents" | "qty"
>;

/**
 * Proyección que ve el cliente en `/checkout/success`. No expone `userId` ni
 * los identificadores de Stripe: la página solo necesita saber en qué estado
 * quedó la compra y qué se compró.
 *
 * `createdAt` es string porque viaja serializado en JSON, no `Date`.
 */
export type OrderSummary = Pick<
  OrderRow,
  "id" | "status" | "totalCents" | "currency"
> & {
  createdAt: string;
  items: OrderSummaryItem[];
};

export type OrderSummaryResponse = {
  data: OrderSummary;
};

export type CreateCheckoutSessionResponse = {
  url: string;
};

/**
 * Desenlace de un pago con tarjeta guardada. Nunca dice `"paid"` aunque Stripe
 * devuelva `succeeded`: el estado real de la orden lo escribe el webhook, y
 * afirmarlo desde la respuesta HTTP sería contar como cobrado algo que todavía
 * no pasó por el fulfillment.
 *
 * - `processing` — Stripe aceptó el cobro; la página de retorno espera al webhook.
 * - `requires_action` — falta autenticar (3DS): hay que ir a `redirectUrl`.
 * - `failed` — rechazo del emisor o autenticación que no se resuelve por redirect.
 */
export type PayResultStatus = "processing" | "requires_action" | "failed";

export type PayResult = {
  orderId: string;
  status: PayResultStatus;
  redirectUrl?: string;
  message?: string;
};

export type PayResultResponse = {
  data: PayResult;
};
