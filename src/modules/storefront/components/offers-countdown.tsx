"use client";

import { Clock } from "lucide-react";
import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

import {
  COUNTDOWN_PLACEHOLDER,
  formatCountdown,
  OFFERS_WINDOW_SECONDS,
  secondsUntil,
} from "../lib/landing";
import { MONO } from "../lib/styles";

/**
 * Contador de la tarjeta de ofertas. El deadline se fija en un efecto tras
 * montar y el primer paint muestra `--:--:--`: calcularlo en render daría un
 * valor distinto en servidor y en cliente, que es un error de hidratación.
 */
export function OffersCountdown({ offerCount }: { offerCount: number }) {
  const [seconds, setSeconds] = useState<number | null>(null);

  useEffect(() => {
    const deadline = Date.now() + OFFERS_WINDOW_SECONDS * 1000;
    const tick = () => setSeconds(secondsUntil(deadline, Date.now()));

    // El primer valor sale en el siguiente turno del event loop: llamar a
    // `setSeconds` en el cuerpo del efecto encadena un render de más.
    const first = setTimeout(tick, 0);
    const timer = setInterval(tick, 1000);

    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, []);

  const label = seconds === null ? COUNTDOWN_PLACEHOLDER : formatCountdown(seconds);
  const countLabel = `${offerCount} ${offerCount === 1 ? "producto" : "productos"} con descuento`;

  return (
    <section className="bg-brand text-on-brand shadow-soft flex items-center justify-between gap-4 rounded-bento-sm px-[22px] py-[18px] lg:col-span-3 lg:flex-col lg:items-stretch lg:rounded-bento lg:p-[22px]">
      <div className="lg:flex lg:items-center lg:justify-between">
        <span className="block text-[13.5px] font-semibold lg:text-[14px]">
          Ofertas
        </span>
        <span className="mt-px block text-[12px] opacity-72 lg:hidden">
          {countLabel}
        </span>
        <Clock aria-hidden className="hidden size-[18px] lg:block" />
      </div>

      <div>
        <p
          className={cn(
            MONO,
            "text-[26px] font-semibold tracking-[-0.03em] lg:text-[34px] lg:tracking-[-0.035em]",
          )}
        >
          {label}
        </p>
        <p className="mt-0.5 hidden text-[12.5px] opacity-72 lg:block">
          terminan en
        </p>
      </div>

      <p className="hidden text-[12.5px] opacity-72 lg:block">{countLabel}</p>
    </section>
  );
}
