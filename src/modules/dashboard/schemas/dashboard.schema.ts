import { z } from "zod";

import { ORDER_STATUSES } from "../constants";

/**
 * `GET /api/admin/dashboard` no recibe entrada: lo que se describe acá es la
 * respuesta. El schema es la única fuente de verdad del contrato —el handler
 * arma el objeto con estos tipos y el service lo parsea al recibirlo—, así que
 * un cambio en la forma rompe las dos puntas a la vez y no en silencio.
 */

/** Un punto de la serie de ventas. `day` es el día civil en UTC. */
export const salesByDayPointSchema = z.object({
  day: z.iso.date(),
  totalCents: z.number().int(),
});

export const ordersByStatusPointSchema = z.object({
  status: z.enum(ORDER_STATUSES),
  total: z.number().int().nonnegative(),
});

/**
 * Proyección del producto con stock bajo. El widget es de solo lectura: no
 * necesita precio, categoría ni banderas internas, y lo que no está acá no sale
 * del servidor porque Zod descarta las claves que no declara.
 */
export const lowStockProductSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  sku: z.string(),
  stock: z.number().int(),
});

export const dashboardMetricsSchema = z.object({
  salesByDay: z.array(salesByDayPointSchema),
  ordersByStatus: z.array(ordersByStatusPointSchema),
  lowStock: z.array(lowStockProductSchema),
  // Se devuelven junto a los datos para que la pantalla rotule "últimos 30
  // días" y "stock ≤ 5" leyendo la respuesta, sin repetir los números en la UI.
  windowDays: z.number().int().positive(),
  lowStockThreshold: z.number().int().nonnegative(),
});
