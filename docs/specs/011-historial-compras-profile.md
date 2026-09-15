---
id: 011
title: Historial de compras en el perfil
status: done
module: orders
scope: client
---

# 011 — Historial de compras en el perfil

## Objetivo

Un cliente autenticado abre `/profile?tab=orders` y ve sus compras agrupadas por día,
filtradas por mes actual o por rango, con detalle y boleta de Stripe en un Dialog.

## Alcance

Incluye:

- `GET /api/orders` con filtro de fechas, solo órdenes del usuario de la sesión.
- Agrupación por día (etiqueta día · mes · año) y total por grupo.
- Filtro: mes actual por defecto · rango `from`/`to` custom.
- Dialog de detalle: líneas de la compra, totales y enlace a la boleta de Stripe.
- `GET /api/orders/[id]/receipt`: resuelve el `receipt_url` contra Stripe on-demand.

No incluye:

- Columna nueva para cachear el `receipt_url`, ni PDF propio.
- Paginación/scroll infinito (el rango acota; tope duro de 200 órdenes por respuesta).
- Reordenar, cancelar, reembolsar, repetir compra, ni exportar CSV.
- Sección de favoritos, ni la ruta `(storefront)/orders/[id]` (queda vacía).

## Criterios de aceptación

- [ ] AC1 — Dado `?tab=orders` sin `from`/`to`, entonces se listan las compras del mes actual, grupos de día en orden descendente y órdenes dentro del grupo también descendente.
- [ ] AC2 — Dado un grupo de día, entonces su encabezado muestra "9 de septiembre de 2026", el número de compras y el importe sumado del grupo.
- [ ] AC3 — Dado un rango custom válido, cuando lo aplico, entonces la lista se recarga con ese rango y el rango vive en el estado del componente (no en la URL).
- [ ] AC4 — Dado `from > to`, o un rango mayor a 366 días, o una fecha con formato inválido, entonces `GET /api/orders` responde 400 y la UI muestra el mensaje sin romperse.
- [ ] AC5 — Dado un usuario sin compras en el rango, entonces se ve el vacío con el rango citado y CTA para ampliar a "últimos 12 meses".
- [ ] AC6 — Dado un visitante sin sesión, entonces `GET /api/orders` responde 401 y no ejecuta consulta.
- [ ] AC7 — Dadas órdenes de otro usuario en el mismo rango, entonces nunca aparecen en la respuesta (filtro por `user_id` en el WHERE, no en JS).
- [ ] AC8 — Dada una orden `pending` (sesión de Checkout abandonada), entonces no aparece en el historial.
- [ ] AC9 — Dado un click en una compra, entonces se abre el Dialog con nombre, cantidad, precio unitario y subtotal de cada línea más el total, sin refetch de la lista.
- [ ] AC10 — Dado el Dialog de una compra `paid`, cuando pulso "Ver boleta", entonces se pide la boleta una sola vez y se abre `receipt_url` en pestaña nueva (`target="_blank" rel="noopener noreferrer"`).
- [ ] AC11 — Dada una compra sin `stripe_payment_intent_id` o cuyo cargo no tiene `receipt_url`, entonces el endpoint responde 404 y el Dialog muestra "La boleta todavía no está disponible" en vez del enlace.
- [ ] AC12 — Dada la boleta de una orden ajena, entonces `GET /api/orders/[id]/receipt` responde 404 con el mismo mensaje que una orden inexistente.

## Datos

Sin cambios de esquema. Se lee `orders` (`user_id`, `status`, `total_cents`, `currency`,
`stripe_payment_intent_id`, `created_at`) y `order_items`. El índice
`orders_user_id_created_at_idx` ya cubre el filtro por usuario + rango.

## API

| Método | Ruta                       | Auth                | Body | Response                                                       |
| ------ | -------------------------- | ------------------- | ---- | -------------------------------------------------------------- |
| GET    | `/api/orders?from=&to=`    | sesión Clerk        | —    | `{ data: { range: { from, to }, groups, count, totalCents } }` |
| GET    | `/api/orders/[id]/receipt` | sesión Clerk, dueño | —    | `{ data: { receiptUrl: string } }`                             |

Ambas con `Cache-Control: no-store` (dato privado).

`groups`: `[{ date: "2026-09-09", totalCents, orders: OrderSummary[] }]`, ordenado desc.
`OrderSummary` se importa de `@/modules/checkout/types/order`: misma proyección, no duplicar.

Zod (`src/modules/orders/schemas/order-history.schema.ts`):

- `orderHistoryQuerySchema` — `from`/`to` opcionales, `z.iso.date()` (`YYYY-MM-DD`);
  ambos ausentes → mes actual; `refine` `from <= to` y rango ≤ 366 días; si viene uno solo,
  400 (no se completa el otro a mano).
- `orderIdSchema` — `z.uuid()`.

## Reutilizar

- `src/server/repositories/order.repository.ts` — se extiende; `loadItems` y el patrón `Db | Tx` ya están.
- `src/modules/checkout/types/order.ts` — `OrderSummary`, `OrderSummaryItem`, `OrderStatus`.
- `src/app/api/orders/by-session/[sessionId]/route.ts` — patrón exacto de auth + dueño + 404 ambiguo y su `toSummary` (copiar; es la segunda repetición, no se extrae todavía).
- `src/lib/auth.ts` — `requireAuth()`, `getCurrentAppUser()`. `src/lib/stripe.ts` — `getStripe()`.
- `src/lib/api-error.ts` — `handleApiError`, `NotFoundError`; los `ZodError` ya se traducen a 400.
- `src/lib/format.ts` — `formatCents`. `src/lib/axios.ts` — `api`. `src/lib/utils.ts` — `cn`.
- `src/modules/checkout/services/checkout.service.ts` + `hooks/use-order-by-session.ts` — patrón service/hook/queryKeys a copiar.
- `src/modules/storefront/lib/styles.ts` — `CARD`, `CHIP`, `CHIP_ON`, `PILL`, `PILL_QUIET`, `MONO`, `FOCUS_RING`, `LIFT`. No inventar clases.
- `src/modules/storefront/components/profile-empty.tsx` — vacío base; extender props para CTA propio en vez de crear otro componente.
- `src/app/(storefront)/profile/page.tsx` — la rama `active === "orders"` monta hoy `ProfileEmpty`.
- `src/components/ui/dialog.tsx`, `badge.tsx`, `skeleton.tsx`, `button.tsx` — ya instalados.

Sin componentes shadcn nuevos: el rango usa dos `<input type="date">` nativos (no hay
`calendar`/`popover` instalados y no justifican el bundle para dos campos).

## Tareas

- [x] T1 — `STORE_UTC_OFFSET` (`-05:00`, Lima sin DST), `currentMonthRange()`, `rangeToInstants(from,to)` (inicio de `from` → inicio de `to`+1 día) y `formatDayLabel(date)`; funciones puras, sin `Date.now()` dentro de las que reciben input · `src/modules/orders/lib/date-range.ts`
- [x] T2 — `groupOrdersByDay(orders)`: agrupa por día local, calcula `totalCents` por grupo, ordena desc · `src/modules/orders/lib/group-orders.ts`
- [x] T3 — Schemas Zod y tipos `OrderHistoryGroup`, `OrderHistoryResponse`, `OrderReceiptResponse` · `src/modules/orders/schemas/order-history.schema.ts`, `src/modules/orders/types/order-history.ts`
- [x] T4 — `findManyByUserInRange({ userId, fromInstant, toInstant })`: órdenes `status <> 'pending'` del usuario, `limit(200)`, ítems en una sola consulta con `inArray` (sin N+1) · `src/server/repositories/order.repository.ts`
- [x] T5 — `findByIdForUser(orderId, userId)`: devuelve la orden solo si es del usuario · `src/server/repositories/order.repository.ts`
- [x] T6 — `GET /api/orders`: valida query, resuelve rango, agrupa y responde · `src/app/api/orders/route.ts`
- [x] T7 — `GET /api/orders/[id]/receipt`: dueño, `paid`, `paymentIntents.retrieve(id, { expand: ["latest_charge"] })` → `receipt_url` o 404 · `src/app/api/orders/[id]/receipt/route.ts`
- [x] T8 — `orderService`: `listGrouped({ from, to })` y `getReceiptUrl(orderId)` (404 → `null`, como `getBySessionId`) · `src/modules/orders/services/order.service.ts`
- [x] T9 — `usePurchaseHistory(range)` con `orderKeys` y `placeholderData: keepPreviousData` · `src/modules/orders/hooks/use-purchase-history.ts`
- [x] T10 — `useOrderReceipt(orderId, enabled)`: `enabled` solo con el Dialog abierto, `staleTime: Infinity` · `src/modules/orders/hooks/use-order-receipt.ts`
- [x] T11 — `PurchaseFilter`: chips "Mes actual" / "Rango", dos `<input type="date">` con `max` = hoy, botón Aplicar deshabilitado si el rango es inválido; solo emite `onChange(range)` · `src/modules/orders/components/purchase-filter.tsx`
- [x] T12 — `PurchaseDetailDialog`: props `{ order, open, onOpenChange }`, líneas + totales + botón de boleta con estados carga/error/no disponible · `src/modules/orders/components/purchase-detail-dialog.tsx`
- [x] T13 — `PurchaseGroup`: encabezado de día (label, nº de compras, total) y filas clickeables (`button`, `LIFT`) que abren el Dialog · `src/modules/orders/components/purchase-group.tsx`
- [x] T14 — `PurchaseHistory` (`"use client"`): rango en `useState` (estado de UI, sin Zustand), skeleton, error, vacío y composición de filtro/grupos/dialog · `src/modules/orders/components/purchase-history.tsx`
- [x] T15 — Montar `<PurchaseHistory />` en la rama `active === "orders"` y quitar su `ProfileEmpty` · `src/app/(storefront)/profile/page.tsx`

Verificación final: `npm run typecheck && npm run lint`

## Notas

- El día del grupo se calcula con el offset fijo de Lima, no con `toISOString()`: una compra
  de las 20:00 caería en el día siguiente y el usuario vería la fecha equivocada.
- Órdenes `pending` fuera del historial: son sesiones de Checkout que nunca se pagaron.
  `payment_failed` sí se lista, con badge, porque el usuario intentó comprar y necesita saberlo.
- No hay `receipt_url` en BD: sale de `latest_charge` del PaymentIntent en cada consulta.
  Por eso la boleta es un endpoint aparte con hook lazy y no un campo de la lista —cargarla
  para 30 compras serían 30 llamadas a Stripe por render.
- `latest_charge` viene como string si no se expande; tipar con `Stripe.Charge` tras el
  `expand` y verificar el tipo antes de leer `receipt_url` (evita `any`).
- El tope de 200 órdenes por respuesta es una guarda, no paginación: si un rango la alcanza,
  se responde igual y se documenta cuando aparezca el caso real.
