import type { OrderStatus } from "@/modules/checkout/types/order";

/** Ventana de la serie de ventas: últimos 30 días civiles en UTC, hoy incluido. */
export const SALES_WINDOW_DAYS = 30;

/** Un producto con este stock o menos entra en el widget de stock bajo. */
export const LOW_STOCK_THRESHOLD = 5;

// Techo de la lista de stock bajo: la consulta ordena `stock asc`, así que lo
// que se recorta es siempre lo menos urgente. Una tabla sin límite crecería con
// el catálogo y el widget dejaría de ser legible.
export const LOW_STOCK_LIMIT = 20;

/** Refresco automático del dashboard, en milisegundos. */
export const REFETCH_INTERVAL_MS = 30_000;

/**
 * Espejo runtime del pgEnum `order_status`. Existe porque el enum de Drizzle
 * vive en `src/server/` y entrar por ahí arrastraría drizzle-orm al bundle del
 * navegador; `satisfies` lo ata al tipo `OrderStatus` para que un valor
 * inventado no compile, y el test compara la lista con `orderStatus.enumValues`
 * para detectar un estado nuevo en la BD.
 *
 * El orden es el del ciclo de vida de una orden y es el que se dibuja en las
 * barras: pendiente → pagada → fallida.
 */
export const ORDER_STATUSES = [
  "pending",
  "paid",
  "payment_failed",
] as const satisfies readonly OrderStatus[];

export const dashboardKeys = {
  all: ["dashboard"] as const,
  metrics: () => [...dashboardKeys.all, "metrics"] as const,
};
