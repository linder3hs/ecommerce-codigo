import { api } from "@/lib/axios";

import type {
  CategoryQueryInput,
  CreateCategoryInput,
  UpdateCategoryInput,
} from "../schemas/category.schema";
import type { Category, CategoryListResponse } from "../types/category";

const RESOURCE = "/categories";

export const categoryService = {
  async list(params: CategoryQueryInput): Promise<CategoryListResponse> {
    const { data } = await api.get<CategoryListResponse>(RESOURCE, { params });

    return data;
  },

  async getById(id: string): Promise<Category> {
    const { data } = await api.get<Category>(`${RESOURCE}/${id}`);

    return data;
  },

  async create(input: CreateCategoryInput): Promise<Category> {
    const { data } = await api.post<Category>(RESOURCE, input);

    return data;
  },

  async update(id: string, input: UpdateCategoryInput): Promise<Category> {
    const { data } = await api.patch<Category>(`${RESOURCE}/${id}`, input);

    return data;
  },

  async remove(id: string): Promise<void> {
    await api.delete(`${RESOURCE}/${id}`);
  },
};
