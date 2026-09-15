import { api } from "@/lib/axios";

import type {
  CheckoutSessionInput,
  PayWithSavedInput,
} from "../schemas/checkout.schema";
import type {
  CreateCheckoutSessionResponse,
  OrderSummary,
  OrderSummaryResponse,
  PayResult,
  PayResultResponse,
} from "../types/order";

export const checkoutService = {
  /** Devuelve la URL hosteada de Stripe a la que hay que redirigir. */
  async createSession(items: CheckoutSessionInput["items"]): Promise<string> {
    const { data } = await api.post<CreateCheckoutSessionResponse>(
      "/checkout/session",
      { items },
    );

    return data.url;
  },

  /**
   * Cobra con una tarjeta ya guardada. Devuelve el desenlace y no una URL: solo
   * algunos casos —3DS por redirect— sacan el navegador de la tienda.
   */
  async payWithSavedMethod(input: PayWithSavedInput): Promise<PayResult> {
    const { data } = await api.post<PayResultResponse>(
      "/checkout/pay",
      input,
    );

    return data.data;
  },

  // El 404 es una respuesta esperada —sesión ajena o inexistente— y no un fallo
  // de red: `validateStatus` lo deja pasar como dato, igual que en
  // `publicProductService.getBySlug`, porque el interceptor de `@/lib/axios`
  // aplana el error de axios y perdería el status.
  async getBySessionId(sessionId: string): Promise<OrderSummary | null> {
    const { status, data } = await api.get<OrderSummaryResponse>(
      `/orders/by-session/${encodeURIComponent(sessionId)}`,
      { validateStatus: (value) => value === 200 || value === 404 },
    );

    return status === 404 ? null : data.data;
  },

  // Contracara de `getBySessionId` para el pago con tarjeta guardada, que
  // vuelve a la tienda con el id de la orden y no con el de una sesión.
  async getById(orderId: string): Promise<OrderSummary | null> {
    const { status, data } = await api.get<OrderSummaryResponse>(
      `/orders/${encodeURIComponent(orderId)}`,
      { validateStatus: (value) => value === 200 || value === 404 },
    );

    return status === 404 ? null : data.data;
  },
};
