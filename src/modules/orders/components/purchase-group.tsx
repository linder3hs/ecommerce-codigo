"use client";

import { ChevronRight } from "lucide-react";

import { formatCents } from "@/lib/format";
import { cn } from "@/lib/utils";
import { CARD, FOCUS_RING, LIFT, MONO } from "@/modules/storefront/lib/styles";

import { formatDayLabel } from "../lib/date-range";

import { PurchaseStatusTag } from "./purchase-status-tag";

import type { OrderSummary } from "@/modules/checkout/types/order";
import type { OrderHistoryGroup } from "../types/order-history";

type PurchaseGroupProps = {
  group: OrderHistoryGroup;
  onSelect: (order: OrderSummary) => void;
};

function unitCount(order: OrderSummary): number {
  return order.items.reduce((total, item) => total + item.qty, 0);
}

function preview(order: OrderSummary): string {
  return order.items.map((item) => item.nameSnapshot).join(" · ");
}

/** Compras de un día: encabezado con el importe del día y una fila por compra. */
export function PurchaseGroup({ group, onSelect }: PurchaseGroupProps) {
  const count = group.orders.length;

  return (
    <section className={cn(CARD, "p-3.5 lg:p-4")}>
      <header className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-1.5 pt-1 pb-3.5">
        <div>
          <h3 className="text-[15px] font-medium">
            {formatDayLabel(group.date)}
          </h3>
          <p className="text-ink-muted mt-0.5 text-[12.5px]">
            {count} {count === 1 ? "compra" : "compras"}
          </p>
        </div>
        <span className={cn(MONO, "text-[16px] font-semibold")}>
          {formatCents(group.totalCents)}
        </span>
      </header>

      <ul className="flex flex-col gap-2">
        {group.orders.map((order) => {
          const units = unitCount(order);

          return (
            <li key={order.id}>
              <button
                type="button"
                onClick={() => onSelect(order)}
                className={cn(
                  LIFT,
                  FOCUS_RING,
                  "bg-sunk flex w-full items-center gap-3 rounded-[20px] p-3.5 text-left",
                )}
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-medium">
                    {preview(order)}
                  </p>
                  <p className="text-ink-muted mt-1 flex flex-wrap items-center gap-2 text-[12.5px]">
                    <PurchaseStatusTag status={order.status} />
                    <span className={MONO}>
                      {units} {units === 1 ? "unidad" : "unidades"}
                    </span>
                  </p>
                </div>
                <span className={cn(MONO, "shrink-0 text-[14.5px] font-medium")}>
                  {formatCents(order.totalCents)}
                </span>
                <ChevronRight aria-hidden className="text-ink-muted size-4 shrink-0" />
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
