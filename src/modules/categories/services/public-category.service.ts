import { api } from "@/lib/axios";

import type { PublicCategoryListResponse } from "../types/public-category";

const RESOURCE = "/storefront/categories";

export const publicCategoryService = {
  async list(): Promise<PublicCategoryListResponse> {
    const { data } = await api.get<PublicCategoryListResponse>(RESOURCE);

    return data;
  },
};
