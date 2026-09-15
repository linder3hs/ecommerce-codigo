"use client";

import { Receipt } from "lucide-react";
import { useState } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { formatCents } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ProfileEmpty } from "@/modules/storefront/components/profile-empty";
import { StorefrontError } from "@/modules/storefront/components/storefront-error";
import {
  CARD,
  MONO,
  PILL,
  PILL_QUIET,
} from "@/modules/storefront/lib/styles";

import { usePurchaseHistory } from "../hooks/use-purchase-history";
import {
  currentMonthRange,
  formatDayLabel,
  HISTORY_LOOKBACK_DAYS,
  lastDaysRange,
  rangeDays,
} from "../lib/date-range";

import { PurchaseDetailDialog } from "./purchase-detail-dialog";
import { PurchaseFilter } from "./purchase-filter";
import { PurchaseGroup } from "./purchase-group";

import type { OrderSummary } from "@/modules/checkout/types/order";

/**
 * Historial de compras del perfil. El rango vive en estado local del
 * componente: es estado de UI de una sola vista, no dato de servidor ni algo
 * que otra parte de la app necesite (docs/SETUP.md §3, regla 6).
 */
export function PurchaseHistory() {
  // El mes en curso se resuelve una vez al montar. Recalcularlo en cada render
  // metería el reloj en el cuerpo del componente y cambiaría la clave de la
  // consulta al cruzar la medianoche a mitad de sesión.
  const [monthRange] = useState(currentMonthRange);
  const [range, setRange] = useState(monthRange);
  const [selected, setSelected] = useState<OrderSummary | null>(null);
  const [isDetailOpen, setDetailOpen] = useState(false);

  const query = usePurchaseHistory(range);

  function openDetail(order: OrderSummary) {
    setSelected(order);
    setDetailOpen(true);
  }

  if (query.isPending) {
    return (
      <div className="flex flex-col gap-3.5 lg:gap-4">
        <Skeleton className={cn(CARD, "h-[86px] w-full")} />
        <Skeleton className={cn(CARD, "h-[210px] w-full")} />
        <Skeleton className={cn(CARD, "h-[150px] w-full")} />
      </div>
    );
  }

  if (query.isError) {
    return (
      <div className={cn(CARD)}>
        <StorefrontError
          // El mensaje viene del servidor —un rango inválido responde 400 con
          // el motivo— y el interceptor de axios ya lo aplanó al `Error`.
          message={query.error.message}
          onRetry={() => void query.refetch()}
          className="py-16"
        />
      </div>
    );
  }

  const history = query.data;
  // Ampliar el rango solo tiene sentido si el actual es más corto que la
  // ventana del CTA.
  const canWiden = rangeDays(range.from, range.to) < HISTORY_LOOKBACK_DAYS;

  return (
    <div className="flex flex-col gap-3.5 lg:gap-4">
      <PurchaseFilter
        range={range}
        monthRange={monthRange}
        onChange={setRange}
      />

      {history.count === 0 ? (
        <ProfileEmpty
          icon={Receipt}
          title="Sin compras en este rango"
          description={`Entre el ${formatDayLabel(history.range.from)} y el ${formatDayLabel(history.range.to)} no registramos ninguna compra.`}
          action={
            canWiden ? (
              <button
                type="button"
                onClick={() => setRange(lastDaysRange(HISTORY_LOOKBACK_DAYS))}
                className={cn(PILL, PILL_QUIET, "mt-3 h-11 px-5 text-[14px]")}
              >
                Ver los últimos 12 meses
              </button>
            ) : undefined
          }
        />
      ) : (
        <div
          className={cn(
            "flex flex-col gap-3.5 lg:gap-4",
            // Con `keepPreviousData` la lista anterior sigue en pantalla
            // mientras llega el rango nuevo: atenuarla dice que está vieja.
            query.isPlaceholderData && "opacity-60 transition-opacity",
          )}
        >
          <p className="text-ink-muted px-1.5 text-[13px]">
            {history.count} {history.count === 1 ? "compra" : "compras"} ·{" "}
            <span className={cn(MONO, "text-ink font-medium")}>
              {formatCents(history.totalCents)}
            </span>
          </p>

          {history.groups.map((group) => (
            <PurchaseGroup
              key={group.date}
              group={group}
              onSelect={openDetail}
            />
          ))}
        </div>
      )}

      <PurchaseDetailDialog
        order={selected}
        open={isDetailOpen}
        onOpenChange={setDetailOpen}
      />
    </div>
  );
}
