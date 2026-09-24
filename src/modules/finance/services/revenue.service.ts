import { api } from "@/lib/axios";

import type { RevenueQueryInput } from "../schemas/revenue.schema";
import type { RevenueReport } from "../types/revenue";

// `api` ya trae `/api` como `baseURL`: la ruta real es
// `/api/admin/finance/revenue`.
const RESOURCE = "/admin/finance/revenue";

export const revenueService = {
  /** La respuesta es el `RevenueReport` plano, sin envoltorio `{ data }`. */
  async report(params: RevenueQueryInput): Promise<RevenueReport> {
    const { data } = await api.get<RevenueReport>(RESOURCE, { params });

    return data;
  },
};
