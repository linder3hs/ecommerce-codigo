import type { InferSelectModel } from "drizzle-orm";

// `import type`: se borra en compilación y drizzle-orm nunca llega al bundle
// del navegador.
import type { paymentMethods } from "@/server/db/schema/payment-method";

type PaymentMethodRow = InferSelectModel<typeof paymentMethods>;

/**
 * Proyección que ve el cliente. Se deriva de la fila con `Pick`, así que
 * agregar una columna interna no la filtra por descuido, y deja fuera a
 * propósito `stripePaymentMethodId` y `userId`: el navegador identifica la
 * tarjeta por el uuid de nuestra fila y el `pm_…` lo resuelve el servidor.
 */
export type PaymentMethod = Pick<
  PaymentMethodRow,
  "id" | "brand" | "last4" | "expMonth" | "expYear" | "isDefault"
>;

export type PaymentMethodListResponse = {
  data: PaymentMethod[];
};

export type PaymentMethodResponse = {
  data: PaymentMethod;
};

export type CreateSetupSessionResponse = {
  url: string;
};
