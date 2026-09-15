---
id: 007
title: Stepper de cantidad en tarjetas de producto
status: done
module: cart
scope: client
---

# 007 — Stepper de cantidad en tarjetas de producto

## Objetivo
Un visitante puede ver y ajustar la cantidad de un producto desde la propia tarjeta:
el botón "+" se convierte en un stepper `− N +` cuando ese producto ya está en el carrito.

## Alcance
Incluye:
- Un solo componente `AddToCartControl` que reemplaza los cuatro botones "+" circulares
  existentes (catálogo, spotlight, wide, carrusel mobile).
- Hook `useCartQty(productId)` como única fuente de la cantidad por producto.
- Estilos de stepper en `lib/styles.ts`.

No incluye:
- El CTA ancho del hero (`hero-carousel.tsx`): es una píldora "Agregar al carrito",
  no un "+", y su ancho no admite el stepper sin rediseñar el slide.
- Las miniaturas de `ThumbsCard`: la tarjeta entera es el botón, no hay "+".
- La fila de resultados de `storefront-search.tsx`: el clic agrega y cierra el panel.
- Persistencia del carrito y cambios de esquema.

## Criterios de aceptación
- [ ] AC1 — Dado un producto con qty 0, cuando el visitante pulsa "+", entonces el botón
      se sustituye por el stepper mostrando `1` y el badge del nav sube.
- [ ] AC2 — Dado qty ≥ 1, cuando pulsa "+" del stepper, entonces la cantidad sube de a 1
      hasta el tope 99, donde "+" queda deshabilitado.
- [ ] AC3 — Dado qty 1, cuando pulsa "−", entonces la línea desaparece del drawer y la
      tarjeta vuelve a mostrar el botón "+".
- [ ] AC4 — Dado el mismo producto visible en landing y en `/products`, cuando cambia la
      cantidad en un sitio, entonces todas las tarjetas de ese producto muestran el mismo número.
- [ ] AC5 — Dado un cambio de cantidad hecho desde `cart-drawer`, entonces la tarjeta lo refleja
      sin recargar.
- [ ] AC6 — Dado un producto agotado (`isSoldOut`), entonces se muestra el "+" deshabilitado y
      nunca el stepper.
- [ ] AC7 — El stepper expone `role="group"` con `aria-label` "Cantidad de <producto>", botones
      rotulados y la cifra con `aria-live="polite"`.

## Datos
Sin cambios de esquema. El estado vive en el store Zustand ya existente.

## API
Sin endpoints ni Zod: la feature es 100% cliente sobre `cart-store`.

## Reutilizar
- `src/modules/cart/store/cart-store.ts` — `add(product)` y `setQty(productId, qty)` ya
  cubren alta, incremento, decremento y borrado en 0 (clamp a 99 incluido). **No tocar.**
- `src/modules/storefront/lib/styles.ts` — `CIRC`, `CIRC_DARK`, `FOCUS_RING`, `MONO`.
- `src/modules/cart/components/cart-drawer.tsx` (líneas 121-150) — patrón visual del stepper
  a replicar: contenedor `rounded-full p-[3px]`, dos `CIRC` transparentes y cifra `MONO`.
- `src/modules/storefront/lib/landing.ts` — `isSoldOut(product)`.
- `lucide-react` — `Plus`, `Minus`, `ArrowUpRight`. Sin componentes shadcn nuevos.

## Contrato del componente
`AddToCartControl` en `src/modules/storefront/components/add-to-cart-control.tsx` (`"use client"`):

```
props: {
  product: PublicProduct
  size?: "sm" | "md"        // sm = 34px (carrusel mobile), md = 40px (default)
  tone?: "dark" | "surface" // dark = CIRC + CIRC_DARK; surface = CIRC + bg-surface
  icon?: "plus" | "arrow"   // glifo del estado vacío; default "plus"
  className?: string        // solo posicionamiento (p. ej. absolute del spotlight)
}
```

Render:
- `qty === 0` → un solo botón circular, exactamente el markup actual (`CIRC` + tono + tamaño),
  `disabled` si `isSoldOut`, `aria-label` "Agregar <nombre>" / "<nombre>: agotado".
- `qty > 0` → contenedor `shrink-0` de la misma altura que el círculo, `rounded-full`,
  `p-[3px]`, tono heredado; dentro: botón "−" circular transparente, cifra `MONO`
  (`min-w-[22px]` en md, `min-w-[18px]` en sm, `text-center`, `aria-live="polite"`),
  botón "+" circular transparente deshabilitado en 99.
- Sin animación nueva: basta la transición de `CIRC`.

Mapeo por llamada:
| Uso | size | tone | icon |
|---|---|---|---|
| `catalog-product-card` | md | dark | plus |
| `landing-bento` · WideCard | md | dark | arrow |
| `landing-bento` · SpotlightCard | md | surface | arrow |
| `landing-bento` · MobileCatalog | sm | dark | plus |

## Tareas
- [x] T1 — Hook `useCartQty(productId: string): number` que lee `items.find(...)?.qty ?? 0`
      desde `useCartStore` (devuelve primitivo, sin `useMemo`) · `src/modules/cart/hooks/use-cart-qty.ts`
- [x] T2 — Añadir `STEPPER` (contenedor) y `STEPPER_DARK` reutilizando `CIRC_DARK` como
      referencia de color · `src/modules/storefront/lib/styles.ts`
- [x] T3 — Crear `AddToCartControl` según el contrato de arriba · `src/modules/storefront/components/add-to-cart-control.tsx`
- [x] T4 — Reemplazar el `<button>` "+" por `AddToCartControl`; eliminar el import de
      `useCartStore` y de `Plus` si quedan sin uso · `src/modules/storefront/components/catalog-product-card.tsx`
- [x] T5 — Reemplazar los tres usos de `AddButton` en `SpotlightCard`, `WideCard` y
      `MobileCatalog` por `AddToCartControl`; `AddButton` sobrevive solo para `ThumbsCard`
      · `src/modules/storefront/components/landing-bento.tsx`

Verificación final: `npm run typecheck && npm run lint`

## Notas
- El stepper es ~3x más ancho que el círculo: en `catalog-product-card` y `MobileCatalog` la
  fila es `justify-between` con el precio a la izquierda; el bloque de precio ya es `min-w-0`,
  el control debe ir `shrink-0` para que el precio trunque y la tarjeta no crezca.
- Tras esta feature hay dos steppers en el repo (drawer y tarjeta) con markup distinto;
  no extraer todavía: se extrae a la tercera repetición.
