"use client";

import { Minus, Plus, ShoppingBag, X } from "lucide-react";

import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
import { useMediaQuery } from "@/hooks/use-media-query";
import { formatCents } from "@/lib/format";
import { cn } from "@/lib/utils";
import { CheckoutButton } from "@/modules/checkout/components/checkout-button";
import { ProductPhoto } from "@/modules/storefront/components/product-photo";
import { CIRC, MONO, PILL, PILL_QUIET } from "@/modules/storefront/lib/styles";

import {
  lineTotalCents,
  selectCount,
  selectSubtotalCents,
  useCartStore,
} from "../store/cart-store";

const DESKTOP_QUERY = "(min-width: 1024px)";

/**
 * Carrito. En escritorio entra desde la derecha y en mobile sube como bottom
 * sheet: es el mismo `Sheet` de shadcn con otro `side`, no dos componentes.
 * El contenido viaja a un portal fuera del layout, así que lleva la clase
 * `storefront` para no quedarse sin los tokens del módulo.
 */
export function CartDrawer() {
  const isDesktop = useMediaQuery(DESKTOP_QUERY);
  const items = useCartStore((state) => state.items);
  const isOpen = useCartStore((state) => state.isOpen);
  const setOpen = useCartStore((state) => state.setOpen);
  const setQty = useCartStore((state) => state.setQty);
  const count = useCartStore(selectCount);
  const subtotalCents = useCartStore(selectSubtotalCents);

  return (
    <Sheet open={isOpen} onOpenChange={setOpen}>
      <SheetContent
        side={isDesktop ? "right" : "bottom"}
        showCloseButton={false}
        className={cn(
          "storefront bg-surface text-ink gap-0 border-0 p-0 shadow-float",
          "data-[side=right]:inset-y-5 data-[side=right]:right-5 data-[side=right]:h-auto data-[side=right]:w-[420px] data-[side=right]:rounded-bento data-[side=right]:border-0 data-[side=right]:sm:max-w-[420px]",
          "data-[side=bottom]:max-h-[84%] data-[side=bottom]:rounded-t-[30px] data-[side=bottom]:border-0",
        )}
      >
        <div className="flex items-center justify-between px-[22px] pt-6 pb-4">
          <SheetTitle className="text-ink text-[18px] font-semibold tracking-[-0.025em]">
            Carrito{" "}
            <span className={cn(MONO, "text-ink-muted font-normal")}>
              {count}
            </span>
          </SheetTitle>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Cerrar carrito"
            className={cn(CIRC, "size-10")}
          >
            <X aria-hidden className="size-[17px]" />
          </button>
        </div>

        <SheetDescription className="sr-only">
          Productos agregados al carrito. Las cantidades se ajustan con los
          botones de más y menos.
        </SheetDescription>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2.5 px-10 pt-11 pb-14">
            <div
              className={cn(CIRC, "text-ink-muted pointer-events-none size-14")}
            >
              <ShoppingBag aria-hidden className="size-6" />
            </div>
            <p className="text-[15px] font-medium">Todavía no hay nada acá</p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className={cn(
                PILL,
                PILL_QUIET,
                "mt-1.5 h-[46px] px-5 text-[14px]",
              )}
            >
              Seguir viendo
            </button>
          </div>
        ) : (
          <>
            <ScrollArea className="min-h-0 flex-1 px-3.5">
              <ul className="flex flex-col gap-2 pb-2">
                {items.map((item) => (
                  <li
                    key={item.productId}
                    className="bg-sunk grid grid-cols-[66px_minmax(0,1fr)] items-center gap-3 rounded-[20px] p-2 lg:grid-cols-[64px_minmax(0,1fr)] lg:gap-3.5"
                  >
                    <ProductPhoto
                      src={item.imageUrl}
                      alt={item.name}
                      sizes="66px"
                      className="h-[66px] rounded-2xl lg:h-16"
                    />
                    <div className="min-w-0 pr-1.5">
                      <p className="text-[13.5px] leading-[1.3] font-medium lg:text-[14px]">
                        {item.name}
                      </p>
                      <div className="mt-2 flex items-center justify-between">
                        <div className="bg-surface flex items-center gap-0.5 rounded-full p-[3px]">
                          <button
                            type="button"
                            onClick={() =>
                              setQty(item.productId, item.qty - 1)
                            }
                            aria-label={`Quitar uno de ${item.name}`}
                            className={cn(CIRC, "size-8 bg-transparent lg:size-[26px]")}
                          >
                            <Minus aria-hidden className="size-3.5" />
                          </button>
                          <span
                            className={cn(
                              MONO,
                              "min-w-[22px] text-center text-[13.5px]",
                            )}
                          >
                            {item.qty}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              setQty(item.productId, item.qty + 1)
                            }
                            aria-label={`Agregar uno de ${item.name}`}
                            className={cn(CIRC, "size-8 bg-transparent lg:size-[26px]")}
                          >
                            <Plus aria-hidden className="size-3.5" />
                          </button>
                        </div>
                        <span className={cn(MONO, "text-[14px] font-medium")}>
                          {formatCents(lineTotalCents(item))}
                        </span>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </ScrollArea>

            <div className="px-[22px] pt-4 pb-6">
              <div className="flex items-baseline justify-between">
                <span className="text-ink-muted text-[14px]">Total</span>
                <span
                  className={cn(
                    MONO,
                    "text-[24px] font-semibold tracking-[-0.03em]",
                  )}
                >
                  {formatCents(subtotalCents)}
                </span>
              </div>
              <CheckoutButton className="mt-3.5 lg:mt-4" />
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
