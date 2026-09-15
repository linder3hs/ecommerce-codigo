import { formatCents } from "@/lib/format";
import { cn } from "@/lib/utils";
import { MONO } from "@/modules/storefront/lib/styles";

import type { OrderSummary } from "../types/order";

/**
 * Detalle de lo comprado. Sin `"use client"` propio: no tiene estado ni
 * eventos, solo dibuja las props que le pasa quien lo monta.
 *
 * Los importes salen del snapshot de la orden, no del catálogo: si el precio
 * del producto cambia mañana, esta compra sigue mostrando lo que se pagó.
 */
export function CheckoutOrderSummary({ order }: { order: OrderSummary }) {
  return (
    <div className="mt-6 w-full">
      <ul className="flex flex-col gap-2.5">
        {order.items.map((item) => (
          <li
            key={item.id}
            className="flex items-baseline justify-between gap-4 text-left"
          >
            <span className="min-w-0 text-[14px]">
              {item.nameSnapshot}
              <span className={cn(MONO, "text-ink-muted ml-1.5 text-[12.5px]")}>
                ×{item.qty}
              </span>
            </span>
            <span className={cn(MONO, "shrink-0 text-[14px]")}>
              {formatCents(item.unitPriceCents * item.qty)}
            </span>
          </li>
        ))}
      </ul>

      <div className="border-sunk mt-4 flex items-baseline justify-between border-t pt-4">
        <span className="text-ink-muted text-[14px]">Total</span>
        <span
          className={cn(MONO, "text-[22px] font-semibold tracking-[-0.03em]")}
        >
          {formatCents(order.totalCents)}
        </span>
      </div>
    </div>
  );
}
