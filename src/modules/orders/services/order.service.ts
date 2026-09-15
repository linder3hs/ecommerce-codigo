import { api } from "@/lib/axios";

import type {
  DateRange,
  OrderHistoryData,
  OrderHistoryResponse,
  OrderReceiptResponse,
} from "../types/order-history";

export const orderService = {
  /** Historial del usuario de la sesión, ya agrupado por día por la API. */
  async listGrouped(range: DateRange): Promise<OrderHistoryData> {
    const { data } = await api.get<OrderHistoryResponse>("/orders", {
      params: range,
    });

    return data.data;
  },

  // El 404 es una respuesta esperada —boleta que Stripe todavía no emitió, o
  // compra ajena— y no un fallo de red: `validateStatus` lo deja pasar como
  // dato, igual que `checkoutService.getBySessionId`, porque el interceptor de
  // `@/lib/axios` aplana el error de axios y perdería el status.
  async getReceiptUrl(orderId: string): Promise<string | null> {
    const { status, data } = await api.get<OrderReceiptResponse>(
      `/orders/${encodeURIComponent(orderId)}/receipt`,
      { validateStatus: (value) => value === 200 || value === 404 },
    );

    return status === 404 ? null : data.data.receiptUrl;
  },
};
