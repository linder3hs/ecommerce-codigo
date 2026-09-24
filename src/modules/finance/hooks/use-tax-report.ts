"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { taxKeys } from "../constants";
import { taxService } from "../services/tax.service";

import type { TaxQueryInput } from "../schemas/tax-report.schema";

/**
 * Reporte de IGV de un rango. `keepPreviousData` deja en pantalla el reporte
 * anterior mientras llega el nuevo: sin él, cada cambio de rango o de
 * periodicidad vaciaría tarjetas y tabla y devolvería los skeletons.
 */
export function useTaxReport(params: TaxQueryInput) {
  return useQuery({
    queryKey: taxKeys.report(params),
    queryFn: () => taxService.report(params),
    placeholderData: keepPreviousData,
  });
}
