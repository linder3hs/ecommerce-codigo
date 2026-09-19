import type {
  dashboardMetricsSchema,
  lowStockProductSchema,
  ordersByStatusPointSchema,
  salesByDayPointSchema,
} from "../schemas/dashboard.schema";
import type { z } from "zod";

// Tipos inferidos del schema, no escritos a mano: el contrato de la API se
// declara una sola vez en `dashboard.schema.ts`.
export type SalesByDayPoint = z.infer<typeof salesByDayPointSchema>;

export type OrdersByStatusPoint = z.infer<typeof ordersByStatusPointSchema>;

export type LowStockProduct = z.infer<typeof lowStockProductSchema>;

export type DashboardMetrics = z.infer<typeof dashboardMetricsSchema>;
