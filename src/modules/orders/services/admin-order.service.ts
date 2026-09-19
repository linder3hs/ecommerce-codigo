import { api } from "@/lib/axios";

import type {
  AdminOrderQueryInput,
  UpdateOrderStatusInput,
} from "../schemas/admin-order.schema";
import type {
  AdminOrderDetail,
  AdminOrderDetailResponse,
  AdminOrderListResponse,
} from "../types/admin-order";

// La ruta del panel, separada de `/orders` (historial del cliente): ahí autoriza
// la propiedad de la orden y acá el permiso `orders.read`.
const RESOURCE = "/admin/orders";

/**
 * Única capa que habla con la API de órdenes del panel; los componentes la
 * consumen vía hooks, nunca con axios directo.
 *
 * `list` devuelve la envoltura completa porque la tabla necesita `meta` para la
 * paginación; `detail` y `updateStatus` la desarman, porque `{ data }` no lleva
 * nada más que la orden.
 */
export const adminOrderService = {
  async list(params: AdminOrderQueryInput): Promise<AdminOrderListResponse> {
    // axios serializa los `Date` de `dateFrom`/`dateTo` como ISO 8601, que es
    // justo lo que `adminOrderQuerySchema` vuelve a coercionar en el servidor.
    const { data } = await api.get<AdminOrderListResponse>(RESOURCE, {
      params,
    });

    return data;
  },

  async detail(id: string): Promise<AdminOrderDetail> {
    const { data } = await api.get<AdminOrderDetailResponse>(
      `${RESOURCE}/${encodeURIComponent(id)}`,
    );

    return data.data;
  },

  /**
   * El cuerpo lleva `expectedStatus` —el estado que el admin tenía en pantalla—
   * y la respuesta es la orden completa ya actualizada. Si el webhook de Stripe
   * la movió entre medio el handler responde 409 y el interceptor de
   * `@/lib/axios` propaga su mensaje como `Error`.
   */
  async updateStatus(
    id: string,
    input: UpdateOrderStatusInput,
  ): Promise<AdminOrderDetail> {
    const { data } = await api.patch<AdminOrderDetailResponse>(
      `${RESOURCE}/${encodeURIComponent(id)}/status`,
      input,
    );

    return data.data;
  },
};
