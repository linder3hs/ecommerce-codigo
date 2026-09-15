"use client";

import { CreditCard, Loader2, Plus } from "lucide-react";
import { useCallback, useSyncExternalStore } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { ProfileEmpty } from "@/modules/storefront/components/profile-empty";
import { StorefrontError } from "@/modules/storefront/components/storefront-error";
import { CARD, PILL, PILL_BRAND, PILL_QUIET } from "@/modules/storefront/lib/styles";

import { useCreateSetupSession } from "../hooks/use-create-setup-session";
import { usePaymentMethods } from "../hooks/use-payment-methods";
import {
  getServerSetupBaseline,
  getSetupBaseline,
  isAwaitingCard,
  subscribeSetupBaseline,
} from "../lib/setup-return";
import { PaymentMethodCard } from "./payment-method-card";

import type { PaymentMethod } from "../types/payment-method";

/**
 * Tab "Métodos de pago" del perfil. Isla cliente: la lista cambia con las
 * acciones de la persona y con un webhook que puede llegar después, así que es
 * dato de TanStack Query y no lectura inicial del Server Component.
 *
 * `justAdded` viene de `?setup=success`. Volver de Stripe NO significa que la
 * tarjeta esté guardada —eso lo escribe el webhook—, así que mientras la lista
 * no crezca la vista dice que está confirmando en vez de afirmar de más.
 */
export function PaymentMethodList({ justAdded }: { justAdded: boolean }) {
  // `sessionStorage` no existe en el render del servidor: `useSyncExternalStore`
  // es el hook que sabe leerlo devolviendo `null` en el servidor y el valor real
  // tras la hidratación, sin efectos ni estado que sincronizar.
  const baseline = useSyncExternalStore(
    subscribeSetupBaseline,
    getSetupBaseline,
    getServerSetupBaseline,
  );

  // El sondeo se decide con la última respuesta en la mano: se corta solo en
  // cuanto la tarjeta aparece o cuando se agota la espera por el webhook.
  const awaitingNew = useCallback(
    (cards: PaymentMethod[]) =>
      justAdded && isAwaitingCard(baseline, cards.length, Date.now()),
    [justAdded, baseline],
  );

  const query = usePaymentMethods({ awaitingNew });
  const setup = useCreateSetupSession();

  // La mutación termina redirigiendo a Stripe: el botón sigue bloqueado tras el
  // éxito hasta que la página se va, para no abrir dos sesiones.
  const redirecting = setup.isPending || setup.isSuccess;

  function addCard() {
    setup.mutate(query.data?.length ?? 0);
  }

  const addButton = (
    <button
      type="button"
      disabled={redirecting}
      onClick={addCard}
      className={cn(PILL, PILL_BRAND, "h-11 px-5 text-[14px]")}
    >
      {redirecting ? (
        <Loader2 aria-hidden className="size-4 animate-spin" />
      ) : (
        <Plus aria-hidden className="size-4" />
      )}
      {redirecting ? "Redirigiendo a Stripe…" : "Agregar tarjeta"}
    </button>
  );

  if (query.isPending) {
    return (
      <div className="flex flex-col gap-3.5 lg:gap-4">
        <Skeleton className={cn(CARD, "h-[92px] w-full")} />
        <Skeleton className={cn(CARD, "h-[92px] w-full")} />
      </div>
    );
  }

  if (query.isError) {
    return (
      <div className={CARD}>
        <StorefrontError
          message={query.error.message}
          onRetry={() => void query.refetch()}
          className="py-16"
        />
      </div>
    );
  }

  // Tras las dos guardas el union de TanStack Query ya está estrechado y la
  // lista deja de ser opcional.
  const cards = query.data;
  // Se mide contra la marca de la última respuesta y no contra el reloj: así el
  // aviso es función de los datos y el render sigue siendo determinista.
  const confirming =
    justAdded && isAwaitingCard(baseline, cards.length, query.dataUpdatedAt);

  return (
    <div className="flex flex-col gap-3.5 lg:gap-4">
      {confirming ? (
        <p
          role="status"
          className={cn(
            CARD,
            "text-ink-muted flex items-center gap-2.5 px-5 py-4 text-[13.5px]",
          )}
        >
          <Loader2 aria-hidden className="size-4 shrink-0 animate-spin" />
          Estamos confirmando tu tarjeta con Stripe. Aparece acá en cuanto
          quede registrada.
        </p>
      ) : null}

      {setup.error ? (
        <p role="alert" className="text-ink-muted px-1.5 text-[13px]">
          {setup.error.message}
        </p>
      ) : null}

      {cards.length === 0 ? (
        <ProfileEmpty
          icon={CreditCard}
          title="Todavía no guardaste ninguna tarjeta"
          description="Guardá una tarjeta para pagar tus compras sin volver a tipearla. No se te cobra nada al agregarla."
          action={addButton}
        />
      ) : (
        <section className={cn(CARD, "flex flex-col gap-3 p-3.5 lg:p-4")}>
          <div className="flex items-center justify-between gap-3 px-1 pt-1">
            <h2 className="text-[15px] font-medium">Tus tarjetas</h2>
            <button
              type="button"
              disabled={redirecting}
              onClick={addCard}
              className={cn(PILL, PILL_QUIET, "h-10 px-4 text-[13.5px]")}
            >
              {redirecting ? (
                <Loader2 aria-hidden className="size-4 animate-spin" />
              ) : (
                <Plus aria-hidden className="size-4" />
              )}
              Agregar
            </button>
          </div>

          <ul className="flex flex-col gap-2">
            {cards.map((method) => (
              <PaymentMethodCard key={method.id} method={method} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
