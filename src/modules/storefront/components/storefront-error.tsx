"use client";

import { RotateCcw } from "lucide-react";

import { cn } from "@/lib/utils";

import { PILL, PILL_QUIET } from "../lib/styles";

type StorefrontErrorProps = {
  message?: string;
  onRetry: () => void;
  className?: string;
};

const DEFAULT_MESSAGE = "No pudimos cargar esta sección.";

/**
 * Estado de error de cualquier isla de la landing: mensaje y reintento. Existe
 * una sola vez porque el hero, el bento y el buscador fallan igual y la persona
 * necesita la misma salida en los tres.
 */
export function StorefrontError({
  message,
  onRetry,
  className,
}: StorefrontErrorProps) {
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center justify-center gap-3 p-8 text-center",
        className,
      )}
    >
      <p className="text-ink-muted text-[13.5px]">
        {message ?? DEFAULT_MESSAGE}
      </p>
      <button
        type="button"
        onClick={onRetry}
        className={cn(PILL, PILL_QUIET, "h-[42px] px-[18px] text-[14px]")}
      >
        <RotateCcw aria-hidden className="size-4" />
        Reintentar
      </button>
    </div>
  );
}
