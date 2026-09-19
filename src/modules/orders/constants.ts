import { ORDER_STATUSES } from "@/modules/dashboard/constants";

import type { OrderStatus } from "@/modules/checkout/types/order";

import type { AdminOrderQueryInput } from "./schemas/admin-order.schema";

// Coincide con el `default` de `pageSize` en `adminOrderQuerySchema`; las
// opciones no pasan del `max` de 100 que ese schema acepta.
export const DEFAULT_PAGE_SIZE = 20;

export const PAGE_SIZE_OPTIONS = [20, 50, 100] as const;

// Valor centinela de los selects: `Select` de Radix no admite `value=""`, así
// que "sin filtro" necesita un literal propio.
export const ALL_FILTER_VALUE = "all";

// Mismo retardo que el resto de los listados del panel (productos, categorías,
// clientes): la búsqueda se debounce en la vista antes de armar la query.
export const SEARCH_DEBOUNCE_MS = 400;

/**
 * Raíz propia (`admin-orders`) y no `orders`: el historial del cliente ya vive
 * bajo `["orders"]` y una invalidación del panel no debe tirar su caché.
 */
export const adminOrderKeys = {
  all: ["admin-orders"] as const,
  lists: () => [...adminOrderKeys.all, "list"] as const,
  list: (params: AdminOrderQueryInput) =>
    [...adminOrderKeys.lists(), params] as const,
  details: () => [...adminOrderKeys.all, "detail"] as const,
  detail: (id: string) => [...adminOrderKeys.details(), id] as const,
};

// `Record<OrderStatus, …>` para que un estado nuevo en el pgEnum sea un error de
// compilación y no una celda vacía en la tabla.
export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "Pendiente",
  paid: "Pagada",
  payment_failed: "Pago fallido",
};

// Se recorre `ORDER_STATUSES` y no las claves del mapa: así el orden del select
// es el del ciclo de vida de la orden y no el de inserción del objeto.
export const ORDER_STATUS_OPTIONS = [
  { value: ALL_FILTER_VALUE, label: "Todos los estados" },
  ...ORDER_STATUSES.map((status) => ({
    value: status,
    label: ORDER_STATUS_LABELS[status],
  })),
] as const;

/** Valor del select de estado: un `OrderStatus` o el centinela "sin filtro". */
export type OrderStatusFilter = OrderStatus | typeof ALL_FILTER_VALUE;
