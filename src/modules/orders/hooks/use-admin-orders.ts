"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { adminOrderKeys } from "../constants";
import { adminOrderService } from "../services/admin-order.service";

import type { AdminOrderQueryInput } from "../schemas/admin-order.schema";

/**
 * Listado paginado del panel. `keepPreviousData` mantiene la página anterior
 * mientras llega la nueva: la tabla no se vacía al paginar ni al cambiar filtros.
 */
export function useAdminOrders(params: AdminOrderQueryInput) {
  return useQuery({
    queryKey: adminOrderKeys.list(params),
    queryFn: () => adminOrderService.list(params),
    placeholderData: keepPreviousData,
  });
}

/**
 * Detalle de una orden. Perezoso: con el diálogo cerrado el id es `""` y no se
 * pide nada. Sin `keepPreviousData` a propósito, para que abrir otra orden no
 * muestre por un instante las líneas de la anterior.
 */
export function useAdminOrder(id: string) {
  return useQuery({
    queryKey: adminOrderKeys.detail(id),
    queryFn: () => adminOrderService.detail(id),
    enabled: id !== "",
  });
}
