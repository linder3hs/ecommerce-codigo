"use client";

import { Loader2 } from "lucide-react";
import { useState } from "react";

import { cn } from "@/lib/utils";
import { useCartStore } from "@/modules/cart/store/cart-store";
import { PaymentMethodPicker } from "@/modules/payment-methods/components/payment-method-picker";
import { usePaymentMethods } from "@/modules/payment-methods/hooks/use-payment-methods";
import { PILL, PILL_BRAND } from "@/modules/storefront/lib/styles";

import { useCreateCheckoutSession } from "../hooks/use-create-checkout-session";
import { usePayWithSavedMethod } from "../hooks/use-pay-with-saved-method";

import type { PaymentMethod } from "@/modules/payment-methods/types/payment-method";

// `undefined` es "todavía no eligió": la preselección se deriva de la lista
// cuando llega, sin un efecto que sincronice estado con datos de servidor.
type Choice = string | null | undefined;

function preselected(methods: PaymentMethod[]): string | null {
  return methods.find((method) => method.isDefault)?.id ?? null;
}

/**
 * Pago del carrito. Dos caminos detrás del mismo botón: con una tarjeta
 * guardada elegida se cobra por PaymentIntent sin salir de la tienda; sin
 * tarjetas, sin sesión o eligiendo "otra tarjeta" se abre la página hosteada de
 * Stripe de siempre.
 *
 * Al servidor solo viajan `productId`, `qty` y el uuid de la tarjeta: el precio
 * lo relee el Route Handler desde la base, así que lo que el store tenga
 * guardado no puede alterar el importe cobrado.
 */
export function CheckoutButton({ className }: { className?: string }) {
  const items = useCartStore((state) => state.items);
  const { data: methods } = usePaymentMethods();
  const [choice, setChoice] = useState<Choice>(undefined);

  const session = useCreateCheckoutSession();
  const pay = usePayWithSavedMethod();

  const cards = methods ?? [];
  const selectedId = choice === undefined ? preselected(cards) : choice;

  // El rechazo del emisor llega como respuesta correcta, no como error de red:
  // se lee del resultado y deja el carrito intacto para reintentar con otra.
  const declined = pay.data?.status === "failed" ? pay.data.message : null;

  // Ninguna de las dos mutaciones apaga su estado tras el éxito a propósito:
  // terminan navegando fuera y el botón debe seguir bloqueado hasta que la
  // página se vaya, sin dejar disparar un segundo cobro.
  const redirecting = session.isPending || session.isSuccess;
  const paying = pay.isPending || (pay.isSuccess && declined === null);
  const busy = redirecting || paying;

  const message = session.error?.message ?? pay.error?.message ?? declined;

  function submit() {
    const lines = items.map((item) => ({
      productId: item.productId,
      qty: item.qty,
    }));

    if (selectedId) {
      pay.mutate({ items: lines, paymentMethodId: selectedId });

      return;
    }

    session.mutate(lines);
  }

  return (
    <div className={className}>
      {cards.length > 0 ? (
        <PaymentMethodPicker
          methods={cards}
          value={selectedId}
          onChange={setChoice}
          disabled={busy}
        />
      ) : null}

      <button
        type="button"
        disabled={items.length === 0 || busy}
        onClick={submit}
        className={cn(
          PILL,
          PILL_BRAND,
          "h-[54px] w-full justify-center text-[15px] lg:h-[52px]",
          cards.length > 0 && "mt-3",
        )}
      >
        {busy ? (
          <Loader2 aria-hidden className="size-[18px] animate-spin" />
        ) : null}
        {paying ? "Procesando pago…" : null}
        {redirecting ? "Redirigiendo a Stripe…" : null}
        {busy ? null : selectedId ? "Pagar ahora" : "Ir a pagar"}
      </button>

      {message ? (
        <p role="alert" className="text-ink-muted mt-2 text-center text-[12px]">
          {message}
        </p>
      ) : (
        <p className="text-ink-muted mt-2 text-center text-[11.5px]">
          {selectedId
            ? "El cobro lo procesa Stripe con tu tarjeta guardada."
            : "El pago se procesa en Stripe."}
        </p>
      )}
    </div>
  );
}
