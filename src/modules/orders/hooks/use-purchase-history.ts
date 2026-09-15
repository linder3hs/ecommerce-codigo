"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { orderService } from "../services/order.service";

import type { DateRange } from "../types/order-history";

export const orderKeys = {
  all: ["orders"] as const,
  histories: () => [...orderKeys.all, "history"] as const,
  history: (range: DateRange) => [...orderKeys.histories(), range] as const,
  receipts: () => [...orderKeys.all, "receipt"] as const,
  receipt: (orderId: string) => [...orderKeys.receipts(), orderId] as const,
};

/**
 * Historial del rango pedido. Al cambiar de rango se mantiene la lista anterior
 * en pantalla: sin esto la sección parpadea a vacío entre una consulta y la
 * siguiente y parece que las compras desaparecieron.
 */
export function usePurchaseHistory(range: DateRange) {
  return useQuery({
    queryKey: orderKeys.history(range),
    queryFn: () => orderService.listGrouped(range),
    placeholderData: keepPreviousData,
  });
}
