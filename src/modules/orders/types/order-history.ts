import type { OrderSummary } from "@/modules/checkout/types/order";

/** Rango de días civiles de la tienda, en `YYYY-MM-DD` inclusivo en ambos extremos. */
export type DateRange = {
  from: string;
  to: string;
};

/**
 * Compras de un mismo día civil de la tienda. `totalCents` es la suma de los
 * importes del grupo: enteros, nunca floats.
 */
export type OrderHistoryGroup = {
  date: string;
  totalCents: number;
  orders: OrderSummary[];
};

export type OrderHistoryData = {
  /** El rango efectivamente consultado: sin `from`/`to` la API resuelve el mes actual. */
  range: DateRange;
  groups: OrderHistoryGroup[];
  count: number;
  totalCents: number;
};

export type OrderHistoryResponse = {
  data: OrderHistoryData;
};

export type OrderReceiptResponse = {
  data: { receiptUrl: string };
};
