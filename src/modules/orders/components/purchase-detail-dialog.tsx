"use client";

import { ExternalLink, Loader2 } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatCents } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  MONO,
  PILL,
  PILL_BRAND,
  PILL_QUIET,
} from "@/modules/storefront/lib/styles";

import { useOrderReceipt } from "../hooks/use-order-receipt";
import { formatDayLabel, toStoreDay } from "../lib/date-range";

import { PurchaseStatusTag } from "./purchase-status-tag";

import type { OrderSummary } from "@/modules/checkout/types/order";

type PurchaseDetailDialogProps = {
  /** `null` mientras no se eligió ninguna compra. */
  order: OrderSummary | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const RECEIPT_UNAVAILABLE = "La boleta todavía no está disponible.";

function Receipt({ order }: { order: OrderSummary }) {
  // Solo una compra pagada tiene cargo en Stripe. El resto no consulta nada.
  const enabled = order.status === "paid";
  const query = useOrderReceipt(order.id, enabled);

  if (!enabled) {
    return (
      <p className="text-ink-muted mt-6 text-[13px]">
        Una compra que no se completó no genera boleta.
      </p>
    );
  }

  if (query.isPending) {
    return (
      <p className="text-ink-muted mt-6 flex items-center gap-2 text-[13px]">
        <Loader2 aria-hidden className="size-4 animate-spin" />
        Buscando la boleta…
      </p>
    );
  }

  if (query.isError) {
    return (
      <button
        type="button"
        onClick={() => void query.refetch()}
        className={cn(PILL, PILL_QUIET, "mt-6 h-11 px-5 text-[14px]")}
      >
        No pudimos leer la boleta. Reintentar
      </button>
    );
  }

  // `null` es 404: compra sin `payment_intent` o cargo sin boleta emitida. Es
  // un dato esperado, no un error.
  if (query.data === null) {
    return (
      <p className="text-ink-muted mt-6 text-[13px]">{RECEIPT_UNAVAILABLE}</p>
    );
  }

  return (
    <a
      href={query.data}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(PILL, PILL_BRAND, "mt-6 h-12 px-6 text-[14px]")}
    >
      Ver boleta
      <ExternalLink aria-hidden className="size-4" />
    </a>
  );
}

/**
 * Detalle de una compra. Los importes salen del snapshot de la orden y no del
 * catálogo: si el precio del producto cambia mañana, esta compra sigue
 * mostrando lo que se pagó.
 *
 * El contenido viaja a un portal fuera del layout, así que lleva la clase
 * `storefront` para no quedarse sin los tokens del módulo.
 */
export function PurchaseDetailDialog({
  order,
  open,
  onOpenChange,
}: PurchaseDetailDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "storefront bg-surface text-ink rounded-bento-sm gap-0 p-6 ring-0 shadow-float sm:max-w-[460px] lg:p-7",
        )}
      >
        {order ? (
          <>
            <DialogHeader>
              <DialogTitle className="text-[19px] font-semibold tracking-[-0.025em]">
                Compra del {formatDayLabel(toStoreDay(new Date(order.createdAt)))}
              </DialogTitle>
              <DialogDescription className="text-ink-muted flex flex-wrap items-center gap-2 text-[13px]">
                <PurchaseStatusTag status={order.status} />
                <span className={MONO}>
                  #{order.id.slice(0, 8)}
                </span>
              </DialogDescription>
            </DialogHeader>

            <ul className="mt-5 flex flex-col gap-3">
              {order.items.map((item) => (
                <li key={item.id} className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-[14px] leading-[1.35] font-medium">
                      {item.nameSnapshot}
                    </p>
                    <p className={cn(MONO, "text-ink-muted mt-0.5 text-[12.5px]")}>
                      {item.qty} × {formatCents(item.unitPriceCents)}
                    </p>
                  </div>
                  <span className={cn(MONO, "shrink-0 text-[14px]")}>
                    {formatCents(item.unitPriceCents * item.qty)}
                  </span>
                </li>
              ))}
            </ul>

            <div className="border-hairline mt-5 flex items-baseline justify-between border-t pt-4">
              <span className="text-ink-muted text-[14px]">Total</span>
              <span
                className={cn(MONO, "text-[22px] font-semibold tracking-[-0.03em]")}
              >
                {formatCents(order.totalCents)}
              </span>
            </div>

            <Receipt order={order} />
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
