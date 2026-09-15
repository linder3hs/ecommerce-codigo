import { api } from "@/lib/axios";

import type { PublicProductQueryInput } from "../schemas/public-product.schema";
import type {
  PublicProduct,
  PublicProductListResponse,
} from "../types/public-product";

// Recurso distinto del `/products` del panel: la proyección y la autorización
// no son las mismas, así que tampoco lo es el service.
const RESOURCE = "/storefront/products";

export const publicProductService = {
  async list(
    params: PublicProductQueryInput,
  ): Promise<PublicProductListResponse> {
    const { data } = await api.get<PublicProductListResponse>(RESOURCE, {
      params,
    });

    return data;
  },

  // El 404 es una respuesta esperada de la ficha —slug inexistente,
  // despublicado o borrado— y no un fallo de red. `validateStatus` lo deja
  // pasar como respuesta normal porque el interceptor de `@/lib/axios` aplana
  // el error de axios a un `Error` sin status y no habría cómo distinguirlo.
  async getBySlug(slug: string): Promise<PublicProduct | null> {
    const { status, data } = await api.get<{ data: PublicProduct }>(
      `${RESOURCE}/${encodeURIComponent(slug)}`,
      { validateStatus: (value) => value === 200 || value === 404 },
    );

    return status === 404 ? null : data.data;
  },
};
