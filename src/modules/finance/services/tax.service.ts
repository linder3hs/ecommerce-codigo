import { api } from "@/lib/axios";

import type { TaxQueryInput } from "../schemas/tax-report.schema";
import type { TaxReport } from "../types/tax";

// `api` ya trae `/api` como `baseURL`: la ruta real es `/api/admin/finance/tax`.
const RESOURCE = "/admin/finance/tax";

export const taxService = {
  /** La respuesta es el `TaxReport` plano, sin envoltorio `{ data }`. */
  async report(params: TaxQueryInput): Promise<TaxReport> {
    const { data } = await api.get<TaxReport>(RESOURCE, { params });

    return data;
  },
};
