"use client";

import { useQuery } from "@tanstack/react-query";

import { orderService } from "../services/order.service";

import { orderKeys } from "./use-purchase-history";

/**
 * Boleta de una compra. Perezosa a propósito: `enabled` solo se enciende con el
 * Dialog abierto, así que abrir el historial no dispara una llamada a Stripe
 * por cada compra listada.
 *
 * `staleTime: Infinity` porque el enlace de una compra pagada no cambia: se
 * pide una vez por sesión y reabrir el mismo Dialog no vuelve a preguntar.
 */
export function useOrderReceipt(orderId: string, enabled: boolean) {
  return useQuery({
    queryKey: orderKeys.receipt(orderId),
    queryFn: () => orderService.getReceiptUrl(orderId),
    enabled: enabled && orderId !== "",
    staleTime: Infinity,
  });
}
