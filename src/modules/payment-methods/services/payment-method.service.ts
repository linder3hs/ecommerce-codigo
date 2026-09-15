import { api } from "@/lib/axios";

import type {
  CreateSetupSessionResponse,
  PaymentMethod,
  PaymentMethodListResponse,
  PaymentMethodResponse,
} from "../types/payment-method";

export const paymentMethodService = {
  async list(): Promise<PaymentMethod[]> {
    const { data } = await api.get<PaymentMethodListResponse>(
      "/payment-methods",
    );

    return data.data;
  },

  /** Devuelve la URL hosteada de Stripe a la que hay que redirigir. */
  async createSetupSession(): Promise<string> {
    const { data } = await api.post<CreateSetupSessionResponse>(
      "/payment-methods/setup-session",
    );

    return data.url;
  },

  async setDefault(id: string): Promise<PaymentMethod> {
    const { data } = await api.patch<PaymentMethodResponse>(
      `/payment-methods/${encodeURIComponent(id)}/default`,
    );

    return data.data;
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/payment-methods/${encodeURIComponent(id)}`);
  },
};
