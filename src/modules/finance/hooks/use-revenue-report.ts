"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { revenueKeys } from "../constants";
import { revenueService } from "../services/revenue.service";

import type { RevenueQueryInput } from "../schemas/revenue.schema";

/**
 * Reporte de ingresos de un rango. `keepPreviousData` deja en pantalla el
 * reporte anterior mientras llega el nuevo: sin él, cada cambio de rango o de
 * desglose vaciaría los tres bloques y devolvería los skeletons.
 */
export function useRevenueReport(params: RevenueQueryInput) {
  return useQuery({
    queryKey: revenueKeys.report(params),
    queryFn: () => revenueService.report(params),
    placeholderData: keepPreviousData,
  });
}
