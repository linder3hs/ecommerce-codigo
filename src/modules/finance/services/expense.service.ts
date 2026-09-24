import { api } from "@/lib/axios";

import type {
  CreateExpenseInput,
  ExpenseQueryInput,
  UpdateExpenseInput,
} from "../schemas/expense.schema";
import type { ExpenseListResponse, ExpenseRow } from "../types/expense";

// `api` ya trae `/api` como `baseURL`: la ruta real es
// `/api/admin/finance/expenses`.
const RESOURCE = "/admin/finance/expenses";

export const expenseService = {
  async list(params: ExpenseQueryInput): Promise<ExpenseListResponse> {
    const { data } = await api.get<ExpenseListResponse>(RESOURCE, { params });

    return data;
  },

  async create(input: CreateExpenseInput): Promise<ExpenseRow> {
    const { data } = await api.post<ExpenseRow>(RESOURCE, input);

    return data;
  },

  // `description: null` viaja tal cual: es "borrar la descripción", distinto
  // del campo ausente, que el handler lee como "no tocar".
  async update(id: string, input: UpdateExpenseInput): Promise<ExpenseRow> {
    const { data } = await api.patch<ExpenseRow>(`${RESOURCE}/${id}`, input);

    return data;
  },

  async remove(id: string): Promise<void> {
    await api.delete(`${RESOURCE}/${id}`);
  },
};
