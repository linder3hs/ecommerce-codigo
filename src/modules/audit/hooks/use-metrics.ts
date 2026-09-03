"use client";

import { useQuery } from "@tanstack/react-query";

import { metricsKeys } from "../constants";
import { metricsService } from "../services/metrics.service";

export function useMetrics() {
  return useQuery({
    queryKey: metricsKeys.summary(),
    queryFn: () => metricsService.summary(),
  });
}
