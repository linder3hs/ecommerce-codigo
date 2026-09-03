import { api } from "@/lib/axios";

import type { PublicProductQueryInput } from "../schemas/public-product.schema";
import type { PublicProductListResponse } from "../types/public-product";

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
};
