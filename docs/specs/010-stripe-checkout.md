---
id: 010
title: Checkout con Stripe (pago único)
status: done
module: checkout
scope: client
---

# 010 — Checkout con Stripe (pago único)

## Objetivo

Un cliente autenticado pulsa "Ir a pagar" en el carrito, paga en una Checkout Session
hosteada por Stripe y su orden queda registrada como `paid` por webhook.

## Alcance

Incluye:

- Tablas `orders` / `order_items` (hoy no existe ninguna orden en BD).
- `POST /api/checkout/session` con `price_data` inline (sin sincronizar catálogo con Stripe).
- `POST /api/webhooks/stripe` con verificación de firma: fulfillment y descuento de stock.
- Páginas `/checkout/success` y `/checkout/cancel` + wiring del botón del `CartDrawer`.

No incluye:

- Suscripciones, Connect, Stripe Tax, guardar tarjetas, Payment Element, multi-moneda.
- Persistir el carrito en BD (sigue en Zustand) ni historial de compras en `/profile?tab=orders`.
- Reembolsos, cancelación de órdenes, emails de confirmación.

Referencia técnica completa: `docs/stripe/checkout-integration.md` (secciones 0, 4 y 5).

## Criterios de aceptación

- [x] AC1 — Dado un carrito con líneas y sesión activa, cuando pulso "Ir a pagar", entonces se crea una fila `orders` en `pending` y el navegador va a `session.url`.
- [x] AC2 — Dado un body con `priceCents` o totales enviados por el cliente, entonces se ignoran: el importe de cada línea sale de `products.priceCents` leído en el servidor.
- [x] AC3 — Dado un producto inactivo, borrado o con `stock < qty`, entonces el endpoint responde 409 con mensaje y no crea sesión ni orden.
- [x] AC4 — Dado un visitante sin sesión, entonces `POST /api/checkout/session` responde 401.
- [x] AC5 — Dado un `checkout.session.completed` con firma válida y `payment_status !== "unpaid"`, entonces la orden pasa a `paid`, se descuenta stock y se escribe `audit_logs`, todo en una transacción.
- [x] AC6 — Dado el mismo evento reenviado por Stripe (at-least-once), entonces la orden ya `paid` no cambia y el stock no se descuenta dos veces; la respuesta sigue siendo 200.
- [x] AC7 — Dado un webhook con firma inválida o ausente, entonces responde 400 y no toca la BD.
- [x] AC8 — Dado `checkout.session.async_payment_failed`, entonces la orden queda `payment_failed` y no se descuenta stock.
- [x] AC9 — Dado `/checkout/success?session_id=…`, entonces se muestra el estado real de la orden; si sigue `pending` se reintenta la lectura hasta que llegue el webhook, sin afirmar "pagado".
- [x] AC10 — Dada una orden ajena, cuando otro usuario pide su `session_id`, entonces responde 404.
- [x] AC11 — Dado `/checkout/cancel`, entonces se ve el aviso de pago cancelado, el carrito conserva sus líneas y hay CTA de vuelta a `/products`.

## Datos

Migración requerida (`npm run db:generate && npm run db:migrate`).

`order_status` (pgEnum): `pending` · `paid` · `payment_failed`.

`orders`: `id` uuid pk · `user_id` uuid notNull FK→`users.id` (restrict) · `status` order_status notNull default `pending` · `total_cents` integer notNull · `currency` varchar(3) notNull · `stripe_checkout_session_id` varchar(255) notNull **unique** · `stripe_payment_intent_id` varchar(255) null · `created_at`/`updated_at` timestamptz notNull.
Índices: `orders_user_id_created_at_idx`. Check: `total_cents >= 0`.

`order_items`: `id` uuid pk · `order_id` uuid notNull FK→`orders.id` (cascade) · `product_id` uuid notNull FK→`products.id` (restrict) · `name_snapshot` varchar(160) notNull · `unit_price_cents` integer notNull · `qty` integer notNull.
Índice: `order_items_order_id_idx`. Checks: `qty > 0`, `unit_price_cents >= 0`.

## API

| Método | Ruta                                 | Auth                   | Body                              | Response                 |
| ------ | ------------------------------------ | ---------------------- | --------------------------------- | ------------------------ |
| POST   | `/api/checkout/session`              | sesión Clerk           | `{ items: [{ productId, qty }] }` | `{ url: string }`        |
| POST   | `/api/webhooks/stripe`               | firma Stripe (público) | evento Stripe (raw)               | `204` sin cuerpo         |
| GET    | `/api/orders/by-session/[sessionId]` | sesión Clerk, dueño    | —                                 | `{ data: OrderSummary }` |

Zod (`src/modules/checkout/schemas/checkout.schema.ts`):

- `checkoutSessionInputSchema` — `items`: array `min(1).max(50)` de `{ productId: uuid, qty: int().min(1).max(CART_MAX_QTY) }`, sin `productId` repetido.
- `stripeSessionIdSchema` — string `startsWith("cs_")`, `max(255)`.

## Reutilizar

- `src/server/db/index.ts` — `getDb()`, tipos `Db` / `Tx` (los repos aceptan `tx` para componerse).
- `src/server/repositories/product.repository.ts` — patrón `server-only` + objeto exportado; `alive()` y `mapUniqueConflict` como referencia.
- `src/lib/api-error.ts` — `handleApiError`, `NotFoundError`, `UnauthorizedError`, `jsonError`.
- `src/lib/auth.ts` — `getCurrentAppUser()` devuelve la fila local de `users` (id uuid) desde la sesión de Clerk.
- `src/lib/audit.ts` — `logAudit(tx, entry)`; `actor_id` es nullable, pensado para webhooks.
- `src/app/api/webhooks/clerk/route.ts` — patrón de webhook público verificado por firma.
- `src/lib/constants.ts` — `APP_URL` para `success_url` / `cancel_url`. No leer `process.env` suelto.
- `src/lib/format.ts` — `formatCents`. `src/lib/axios.ts` — `api`.
- `src/modules/cart/store/cart-store.ts` — `useCartStore`, `selectSubtotalCents`, `clear()`, `CART_MAX_QTY`.
- `src/modules/cart/components/cart-drawer.tsx` — el botón "Ir a pagar" existe `disabled` con nota provisional (líneas 173-188); se sustituye por el componente nuevo.
- `src/modules/storefront/lib/styles.ts` — `PILL`, `PILL_BRAND`, `PILL_QUIET`, `CARD`, `MONO`, `CIRC`.
- `src/modules/products/services/public-product.service.ts` + `hooks/use-public-product.ts` — patrón service/hook a copiar.
- `src/app/(storefront)/products/page.tsx` — shell de página storefront (nav + paddings) para success/cancel.
- `src/proxy.ts` — `/api/webhooks(.*)` ya es público y `/api(.*)` ya sale del middleware: **no tocar**.

Sin componentes shadcn nuevos.

## Tareas

- [x] T1 — `npm install stripe`; cliente lazy `getStripe()` (`server-only`, singleton como `getDb()`, lanza si falta `STRIPE_SECRET_KEY`) + helper `getStoreCurrency()` desde `STRIPE_CURRENCY` · `src/lib/stripe.ts`
- [x] T2 — Schema `orders` + `order_items` + enum, re-export en el barrel, `db:generate` y `db:migrate` · `src/server/db/schema/order.ts`, `src/server/db/schema/index.ts`
- [x] T3 — `ConflictError` (409) y su rama en `handleApiError` · `src/lib/api-error.ts`
- [x] T4 — `findManyActiveByIds(ids)`: filas vivas, activas y con categoría publicada (reusar `buildPublicFilters`) · `src/server/repositories/product.repository.ts`
- [x] T5 — `orderRepository`: `createPending` (orden + ítems en una tx), `findBySessionId`, `markPaid` (idempotente, no-op si ya `paid`), `markPaymentFailed`, `decrementStock(orderId, tx)` con guarda `stock >= qty` · `src/server/repositories/order.repository.ts`
- [x] T6 — Schemas Zod y tipo `OrderSummary` derivado de las filas del repo · `src/modules/checkout/schemas/checkout.schema.ts`, `src/modules/checkout/types/order.ts`
- [x] T7 — `POST /api/checkout/session`: valida, resuelve productos/stock en servidor, `createPending`, crea la Checkout Session (`mode: "payment"`, `price_data` inline, `metadata.orderId`, **sin** `payment_method_types`) y persiste `session.id` · `src/app/api/checkout/session/route.ts`
- [x] T8 — `POST /api/webhooks/stripe`: `request.text()` + `constructEvent`, `completed`/`async_payment_succeeded` → `markPaid` + `decrementStock` + `logAudit` en una tx; `async_payment_failed` → `markPaymentFailed` · `src/app/api/webhooks/stripe/route.ts`
- [x] T9 — `GET /api/orders/by-session/[sessionId]`: 404 si no existe o no es del usuario de la sesión · `src/app/api/orders/by-session/[sessionId]/route.ts`
- [x] T10 — Service del módulo: `createSession(items)` y `getBySessionId(id)` · `src/modules/checkout/services/checkout.service.ts`
- [x] T11 — `useCreateCheckoutSession()` (mutation, redirige con `window.location.href`) · `src/modules/checkout/hooks/use-create-checkout-session.ts`
- [x] T12 — `useOrderBySession(sessionId)` con `refetchInterval` mientras el estado sea `pending` · `src/modules/checkout/hooks/use-order-by-session.ts`
- [x] T13 — `CheckoutButton`: lee líneas del store, dispara la mutation, estados de carga/error inline · `src/modules/checkout/components/checkout-button.tsx`
- [x] T14 — Montar `CheckoutButton` en el drawer y borrar el botón deshabilitado y su nota · `src/modules/cart/components/cart-drawer.tsx`
- [x] T15 — Página `/checkout/success`: lee `session_id`, muestra estado (pagado / confirmando / fallido) e ítems, vacía el carrito una sola vez al confirmar `paid` · `src/app/(storefront)/checkout/success/page.tsx`
- [x] T16 — Página `/checkout/cancel`: aviso, carrito intacto, CTA a `/products` · `src/app/(storefront)/checkout/cancel/page.tsx`

Verificación final: `npm run typecheck && npm run lint`

## Notas

- **Moneda**: `formatCents` imprime `S/` (soles) y `.env.example` trae `STRIPE_CURRENCY="usd"`. Antes de probar hay que fijar `STRIPE_CURRENCY="pen"` o Stripe cobrará dólares sobre precios mostrados en soles. La orden guarda su `currency` para no depender del env a futuro.
- El webhook debe leer el cuerpo con `request.text()`: `request.json()` rompe la verificación de firma.
- Ventana de sobreventa entre crear la sesión y el pago: si al fulfillment el stock ya no alcanza, se marca `paid` igual (el dinero ya se cobró), se deja el stock en 0 y se registra el caso en `audit_logs`. Nunca devolver 4xx/5xx a Stripe por falta de stock: reintentaría el evento indefinidamente.
- `getCurrentAppUser()` puede ser `null` si el webhook `user.created` de Clerk aún no llegó (espejo at-least-once). En ese caso el endpoint responde 409 "tu cuenta se está sincronizando", no 500.
- `/checkout/success` nunca escribe el estado de pago: solo lee la orden. El fulfillment es del webhook (ver `docs/stripe/checkout-integration.md` §5).
- `product_data.images` exige URLs `https://` públicas; contrastar con `src/lib/image-hosts.ts` y omitir el campo si la imagen es relativa.
- Pruebas locales: `stripe listen --forward-to localhost:3000/api/webhooks/stripe` y copiar el `whsec_` que imprime a `STRIPE_WEBHOOK_SECRET`.
