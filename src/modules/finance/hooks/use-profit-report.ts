"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { profitKeys } from "../constants";
import { profitService } from "../services/profit.service";

import type { DateRange } from "@/modules/orders/types/order-history";

/**
 * P&L de un rango. `keepPreviousData` deja en pantalla el reporte anterior
 * mientras llega el nuevo: sin él, cada cambio de rango vaciaría los tres
 * bloques y devolvería los skeletons.
 */
export function useProfitReport(range: DateRange) {
  return useQuery({
    queryKey: profitKeys.report(range),
    queryFn: () => profitService.report(range),
    placeholderData: keepPreviousData,
  });
}
