import { redirect } from "next/navigation";

import { CartDrawer } from "@/modules/cart/components/cart-drawer";
import { CheckoutSuccessView } from "@/modules/checkout/components/checkout-success-view";
import { stripeSessionIdSchema } from "@/modules/checkout/schemas/checkout.schema";
import { orderIdSchema } from "@/modules/orders/schemas/order-history.schema";
import { StorefrontNav } from "@/modules/storefront/components/storefront-nav";
import { CATALOG_PATH } from "@/modules/storefront/lib/catalog";

import type { CheckoutOrderSource } from "@/modules/checkout/hooks/use-checkout-order";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tu compra — tech.",
  // El estado del pago es privado y depende del webhook: nada que indexar.
  robots: { index: false, follow: false },
};

/**
 * Retorno de Stripe. Server Component que solo compone y valida la query: el
 * estado real de la orden lo lee la isla cliente, que reintenta mientras el
 * webhook no haya llegado.
 */
export default async function CheckoutSuccessPage({
  searchParams,
}: PageProps<"/checkout/success">) {
  const { session_id: sessionId, order_id: orderId } = await searchParams;

  // Dos entradas: la sesión hosteada vuelve con `session_id` y el pago con
  // tarjeta guardada —que no crea sesión— con `order_id`.
  const session = stripeSessionIdSchema.safeParse(sessionId);
  const order = orderIdSchema.safeParse(orderId);

  const source: CheckoutOrderSource | null = session.success
    ? { type: "session", id: session.data }
    : order.success
      ? { type: "order", id: order.data }
      : null;

  // Sin un identificador con forma válida no hay compra que mostrar: la URL se
  // escribió a mano o el enlace está roto.
  if (!source) {
    redirect(CATALOG_PATH);
  }

  return (
    <div className="flex flex-1 flex-col gap-3.5 px-4 pt-5 pb-27 lg:gap-5 lg:p-8">
      <StorefrontNav />

      <main className="flex flex-1 items-center justify-center py-6 lg:py-10">
        <CheckoutSuccessView source={source} />
      </main>

      <CartDrawer />
    </div>
  );
}
