import { api } from "@/lib/axios";

import type { MetricsSummary } from "../types/metrics";

const RESOURCE = "/admin/metrics";

export const metricsService = {
  async summary(): Promise<MetricsSummary> {
    const { data } = await api.get<MetricsSummary>(RESOURCE);

    return data;
  },
};
