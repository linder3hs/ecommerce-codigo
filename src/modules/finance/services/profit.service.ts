import { api } from "@/lib/axios";

import type { ProfitReport } from "../types/profit";
import type { DateRange } from "@/modules/orders/types/order-history";

// `api` ya trae `/api` como `baseURL`: la ruta real es
// `/api/admin/finance/profit`.
const RESOURCE = "/admin/finance/profit";

export const profitService = {
  /** La respuesta es el `ProfitReport` plano, sin envoltorio `{ data }`. */
  async report(range: DateRange): Promise<ProfitReport> {
    const { data } = await api.get<ProfitReport>(RESOURCE, { params: range });

    return data;
  },
};
