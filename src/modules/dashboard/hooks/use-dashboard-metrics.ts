"use client";

import { useQuery } from "@tanstack/react-query";

import { dashboardKeys, REFETCH_INTERVAL_MS } from "../constants";
import { dashboardService } from "../services/dashboard.service";

/**
 * Única entrada de datos del dashboard: la vista lo llama una vez y reparte a
 * los tres widgets, así que el polling es uno y no tres.
 */
export function useDashboardMetrics() {
  return useQuery({
    queryKey: dashboardKeys.metrics(),
    queryFn: () => dashboardService.metrics(),
    refetchInterval: REFETCH_INTERVAL_MS,
  });
}
