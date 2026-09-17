import { api } from "@/lib/axios";

import { dashboardMetricsSchema } from "../schemas/dashboard.schema";

import type { DashboardMetrics } from "../types/dashboard";

const RESOURCE = "/admin/dashboard";

export const dashboardService = {
  /**
   * El genérico es `unknown` y no `DashboardMetrics`: lo que llega del cable no
   * está validado todavía, y prometer el tipo antes del parseo dejaría al
   * `parse` sin razón de ser. El tipo de retorno lo infiere el schema, que es la
   * única fuente de verdad del contrato (ver `dashboard.schema.ts`).
   */
  async metrics(): Promise<DashboardMetrics> {
    const { data } = await api.get<unknown>(RESOURCE);

    // `parse` y no `safeParse`: una respuesta que no cumple el contrato tiene
    // que caer en el estado `error` del hook —y en el reintento de la vista—,
    // no dibujar tres widgets a medias con datos de forma desconocida.
    return dashboardMetricsSchema.parse(data);
  },
};
