"use client";

import { CheckCircle2, CircleSlash, Loader2, Receipt } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useCartStore } from "@/modules/cart/store/cart-store";
import { StorefrontError } from "@/modules/storefront/components/storefront-error";
import { CATALOG_PATH } from "@/modules/storefront/lib/catalog";
import { CARD, CIRC, PILL, PILL_BRAND, PILL_QUIET } from "@/modules/storefront/lib/styles";

import { useCheckoutOrder } from "../hooks/use-checkout-order";
import { CheckoutOrderSummary } from "./checkout-order-summary";

import type { CheckoutOrderSource } from "../hooks/use-checkout-order";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import type { OrderStatus } from "../types/order";

// Un texto por estado en vez de tres bloques de JSX casi iguales: el marco —la
// tarjeta, el icono, el detalle de la orden— es el mismo en los tres.
const STATES: Record<
  OrderStatus,
  { icon: LucideIcon; title: string; description: string; spin?: boolean }
> = {
  pending: {
    icon: Loader2,
    title: "Confirmando tu pago",
    description:
      "Stripe todavía no nos confirmó la operación. Esta página se actualiza sola, podés esperar unos segundos.",
    spin: true,
  },
  paid: {
    icon: CheckCircle2,
    title: "¡Pago confirmado!",
    description: "Tu compra quedó registrada. Te avisamos cuando la despachemos.",
  },
  payment_failed: {
    icon: CircleSlash,
    title: "El pago no se completó",
    description:
      "Stripe rechazó la operación y no se te cobró nada. Podés volver a intentarlo desde el carrito.",
  },
};

function Shell({ children }: { children: ReactNode }) {
  return (
    <div
      className={cn(
        CARD,
        "mx-auto flex w-full max-w-[520px] flex-col items-center px-6 py-12 text-center lg:px-10 lg:py-16",
      )}
    >
      {children}
    </div>
  );
}

/**
 * Página de retorno de Stripe. Solo LEE el estado de la orden: el pago lo
 * escribe el webhook, así que llegar a esta URL no significa que la compra esté
 * pagada y la vista nunca lo afirma mientras el estado sea `pending`.
 *
 * `source` distingue de qué camino de pago se vuelve; lo que se muestra es lo
 * mismo en los dos.
 */
export function CheckoutSuccessView({
  source,
}: {
  source: CheckoutOrderSource;
}) {
  const query = useCheckoutOrder(source);
  const clear = useCartStore((state) => state.clear);
  const status = query.data?.status;
  // El vaciado ocurre una sola vez: sin la guarda, cada refetch del sondeo
  // volvería a limpiar un carrito que la persona ya empezó a rearmar.
  const cleared = useRef(false);

  useEffect(() => {
    if (status === "paid" && !cleared.current) {
      cleared.current = true;
      clear();
    }
  }, [status, clear]);

  if (query.isPending) {
    return <Skeleton className={cn(CARD, "mx-auto h-[420px] w-full max-w-[520px]")} />;
  }

  if (query.isError) {
    return (
      <div className={cn(CARD, "mx-auto w-full max-w-[520px]")}>
        <StorefrontError
          message="No pudimos leer el estado de tu compra."
          onRetry={() => void query.refetch()}
          className="py-16"
        />
      </div>
    );
  }

  const order = query.data;

  // `null` es sesión ajena o inexistente: la API responde 404 y el service lo
  // traduce a dato, no a error.
  if (!order) {
    return (
      <Shell>
        <span className={cn(CIRC, "text-ink-muted size-14")}>
          <Receipt aria-hidden className="size-6" />
        </span>
        <h1 className="mt-4 text-[22px] font-semibold tracking-[-0.03em]">
          No encontramos esa compra
        </h1>
        <p className="text-ink-muted mt-1.5 text-[14px]">
          Puede que el enlace no sea válido o que la compra sea de otra cuenta.
        </p>
        <Link
          href={CATALOG_PATH}
          className={cn(PILL, PILL_QUIET, "mt-6 h-12 px-6 text-[14px]")}
        >
          Volver al catálogo
        </Link>
      </Shell>
    );
  }

  const state = STATES[order.status];
  const Icon = state.icon;

  return (
    <Shell>
      <span
        className={cn(
          CIRC,
          "size-14",
          order.status === "paid" ? "bg-brand text-on-brand" : "text-ink-muted",
        )}
      >
        <Icon
          aria-hidden
          className={cn("size-6", state.spin && "animate-spin")}
        />
      </span>

      <h1
        aria-live="polite"
        className="mt-4 text-[22px] font-semibold tracking-[-0.03em] lg:text-[26px]"
      >
        {state.title}
      </h1>
      <p className="text-ink-muted mt-1.5 max-w-[380px] text-[14px]">
        {state.description}
      </p>

      <CheckoutOrderSummary order={order} />

      <Link
        href={CATALOG_PATH}
        className={cn(
          PILL,
          order.status === "paid" ? PILL_BRAND : PILL_QUIET,
          "mt-7 h-12 px-6 text-[14px]",
        )}
      >
        Seguir comprando
      </Link>
    </Shell>
  );
}
