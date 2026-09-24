import { api } from "@/lib/axios";

import type {
  UnitPriceQueryInput,
  UpdateCostInput,
} from "../schemas/unit-price.schema";
import type { UnitPriceListResponse, UnitPriceRow } from "../types/unit-price";

// `api` ya trae `/api` como `baseURL`: la ruta real es
// `/api/admin/finance/unit-price`.
const RESOURCE = "/admin/finance/unit-price";

export const unitPriceService = {
  async list(params: UnitPriceQueryInput): Promise<UnitPriceListResponse> {
    const { data } = await api.get<UnitPriceListResponse>(RESOURCE, { params });

    return data;
  },

  /**
   * El body viaja tal cual, con `costCents: null` incluido: `null` es un valor
   * que el handler espera —"el costo volvió a ser desconocido"— y no un campo
   * ausente. Axios serializa el `null` en el JSON; omitirlo daría el 400 de
   * `updateCostSchema`, que es `nullable` y no `nullish`.
   *
   * La respuesta es la `UnitPriceRow` plana, no `{ data }`: se devuelve sin
   * desenvolver, igual que el `PATCH` de stock.
   */
  async updateCost(id: string, input: UpdateCostInput): Promise<UnitPriceRow> {
    const { data } = await api.patch<UnitPriceRow>(`${RESOURCE}/${id}`, input);

    return data;
  },
};
