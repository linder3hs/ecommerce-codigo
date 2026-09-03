import { api } from "@/lib/axios";

import type {
  CreateProductInput,
  ProductQueryInput,
  UpdateProductInput,
} from "../schemas/product.schema";
import type { Product, ProductListResponse } from "../types/product";

const RESOURCE = "/products";

export const productService = {
  async list(params: ProductQueryInput): Promise<ProductListResponse> {
    const { data } = await api.get<ProductListResponse>(RESOURCE, { params });

    return data;
  },

  async getById(id: string): Promise<Product> {
    const { data } = await api.get<Product>(`${RESOURCE}/${id}`);

    return data;
  },

  async create(input: CreateProductInput): Promise<Product> {
    const { data } = await api.post<Product>(RESOURCE, input);

    return data;
  },

  async update(id: string, input: UpdateProductInput): Promise<Product> {
    const { data } = await api.patch<Product>(`${RESOURCE}/${id}`, input);

    return data;
  },

  async remove(id: string): Promise<void> {
    await api.delete(`${RESOURCE}/${id}`);
  },
};
