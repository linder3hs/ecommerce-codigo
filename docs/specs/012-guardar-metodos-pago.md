---
id: 012
title: Métodos de pago guardados y pago con tarjeta guardada
status: done
module: checkout
scope: client
---

# 012 — Métodos de pago guardados y pago con tarjeta guardada

## Objetivo

Un cliente autenticado guarda una tarjeta desde `/profile?tab=payment-methods` sin que se le
cobre nada, la administra, y la elige en el carrito para pagar sin volver a tipearla.

## Alcance

Incluye:

- Tab "Métodos de pago" en `/profile`: alta por Checkout Session en `mode: "setup"`, listar,
  marcar predeterminada y eliminar (hard delete + `paymentMethods.detach`).
- `users.stripe_customer_id` + tabla `payment_methods`; persistencia por webhook.
- Selector de tarjeta en el `CartDrawer` y cobro con la tarjeta elegida vía PaymentIntent
  confirmado en el servidor, con fallback a la Checkout Session actual.

No incluye:

- Payment Element / Stripe.js en el cliente: no se instala `@stripe/stripe-js`.
- Guardar la tarjeta *durante* una compra (`setup_future_usage`): se guarda solo desde el perfil.
- Direcciones de facturación, wallets, `payment_method` que no sean `card`, editar una tarjeta
  (Stripe no lo permite: se borra y se agrega), y 3DS que no resuelva por redirect (ver AC18).

> **Corrección al requerimiento**: no se guardan "los primeros 4 dígitos". Stripe nunca los
> expone y almacenarlos violaría PCI-DSS. El estándar de visualización es `brand` + `last4`.

## Criterios de aceptación

### Guardar y administrar

- [ ] AC1 — Dado `?tab=payment-methods`, entonces se ven las tarjetas del usuario con marca, `•••• last4` y vencimiento `MM/AAAA`, o el vacío con CTA para agregar.
- [ ] AC2 — Dado "Agregar tarjeta", entonces el navegador va a la Checkout Session en modo setup y **no se cobra ningún importe**.
- [ ] AC3 — Dado un usuario sin `stripe_customer_id`, cuando agrega su primera tarjeta, entonces se crea el Customer y se persiste su id; en la segunda alta se reutiliza el mismo.
- [ ] AC4 — Dado `checkout.session.completed` con `mode === "setup"` y firma válida, entonces se inserta la fila con `brand`, `last4`, `exp_month`, `exp_year` leídos del SetupIntent.
- [ ] AC5 — Dado el mismo evento reenviado, entonces no se duplica la fila (unique sobre `stripe_payment_method_id`) y la respuesta sigue siendo 204.
- [ ] AC6 — Dada la primera tarjeta del usuario, entonces queda `is_default = true` automáticamente.
- [ ] AC7 — Dado "Usar por defecto" en otra tarjeta, entonces esa queda default y la anterior deja de serlo, en una transacción.
- [ ] AC8 — Dado "Eliminar", cuando confirmo en el `AlertDialog`, entonces se hace `detach` en Stripe, se borra la fila y la lista se refresca; si era la default y queda otra, la más reciente pasa a default.
- [ ] AC9 — Dado un `id` de otro usuario en `PATCH`/`DELETE`, entonces responde 404 con el mismo mensaje que un id inexistente.
- [ ] AC10 — Dado un visitante sin sesión, entonces todos los endpoints responden 401 sin consultar BD.
- [ ] AC11 — Dado el retorno a `?tab=payment-methods&setup=success`, entonces la lista se refetchea; si el webhook aún no llegó se muestra "confirmando tu tarjeta" y se reintenta, sin afirmar que ya está guardada.

### Pagar con tarjeta guardada

- [ ] AC12 — Dado un carrito con líneas y al menos una tarjeta guardada, entonces el drawer muestra las tarjetas como opciones con la default preseleccionada, más la opción "Pagar con otra tarjeta".
- [ ] AC13 — Dado un usuario sin tarjetas o sin sesión, entonces el drawer no muestra selector y el botón se comporta igual que hoy (Checkout Session hosteada).
- [ ] AC14 — Dada una tarjeta seleccionada, cuando pulso "Pagar", entonces se crea la orden `pending` y se confirma un PaymentIntent con esa tarjeta; precio, stock y disponibilidad se releen del servidor igual que en el flujo actual (mismo 409 ante producto agotado o despublicado).
- [ ] AC15 — Dado un pago aprobado al instante, entonces el navegador va a `/checkout/success?order_id=…` y la orden queda `paid` por webhook, no por la respuesta HTTP.
- [ ] AC16 — Dado que el cliente manda el `id` de una tarjeta ajena o inexistente, entonces responde 404 y no se crea orden ni PaymentIntent.
- [ ] AC17 — Dada una tarjeta rechazada (`card_declined`), entonces la orden queda `payment_failed`, el carrito conserva sus líneas y el drawer muestra el motivo devuelto por Stripe.
- [ ] AC18 — Dado un PaymentIntent en `requires_action` con `next_action.type === "redirect_to_url"`, entonces se redirige a esa URL; con cualquier otro `next_action` se marca la orden `payment_failed` y se invita a pagar con "otra tarjeta" (el flujo hosteado sí resuelve ese 3DS).
- [ ] AC19 — Dado `payment_intent.succeeded` reenviado por Stripe, entonces la orden ya `paid` no cambia y el stock no se descuenta dos veces.

## Datos

Migración requerida (`npm run db:generate && npm run db:migrate`).

`users`: columna nueva `stripe_customer_id` varchar(255) null + `uniqueIndex` parcial (solo filas no nulas).

`payment_methods` (nueva): `id` uuid pk · `user_id` uuid notNull FK→`users.id` (cascade) ·
`stripe_payment_method_id` varchar(255) notNull **unique** · `brand` varchar(32) notNull ·
`last4` varchar(4) notNull · `exp_month` smallint notNull · `exp_year` smallint notNull ·
`is_default` boolean notNull default `false` · `created_at`/`updated_at` timestamptz notNull.
Índices: `payment_methods_user_id_created_at_idx` y `uniqueIndex` parcial sobre `user_id`
`WHERE is_default`. Check: `exp_month BETWEEN 1 AND 12`.

`orders` (cambia): `stripe_checkout_session_id` pasa a **nullable** (el pago con tarjeta
guardada no crea sesión) y `stripe_payment_intent_id` gana `uniqueIndex` parcial (idempotencia
del webhook nuevo). El unique de `stripe_checkout_session_id` también se vuelve parcial.

## API

| Método | Ruta                                 | Auth                | Body                                | Response                    |
| ------ | ------------------------------------ | ------------------- | ----------------------------------- | --------------------------- |
| GET    | `/api/payment-methods`               | sesión Clerk        | —                                   | `{ data: PaymentMethod[] }` |
| POST   | `/api/payment-methods/setup-session` | sesión Clerk        | —                                   | `{ url: string }`           |
| PATCH  | `/api/payment-methods/[id]/default`  | sesión Clerk, dueño | —                                   | `{ data: PaymentMethod }`   |
| DELETE | `/api/payment-methods/[id]`          | sesión Clerk, dueño | —                                   | `204` sin cuerpo            |
| POST   | `/api/checkout/pay`                  | sesión Clerk, dueño | `{ items, paymentMethodId: uuid }`  | `{ data: PayResult }`       |

`POST /api/checkout/session` **no cambia de contrato**: sigue siendo el camino de "tarjeta
nueva". El pago con tarjeta guardada usa otra API de Stripe y otra forma de respuesta, así que
va en su propio handler en vez de un `if` dentro del existente.

`PayResult` = `{ orderId, status: "processing" | "requires_action" | "failed", redirectUrl?, message? }`.
Nunca `"paid"`: el estado real lo escribe el webhook (AC15).

Endpoints privados con `Cache-Control: no-store`. El webhook existente se extiende; no se crea otro.

Zod:

- `paymentMethodIdSchema` — `z.uuid()` · `paymentMethodSchema` — `{ id, brand, last4, expMonth, expYear, isDefault }`.
  Al cliente **nunca** se le expone `stripe_payment_method_id` ni `stripe_customer_id`: el body
  de `/api/checkout/pay` manda el uuid de nuestra fila y el servidor resuelve el `pm_…`.
- `payWithSavedInputSchema` — `checkoutSessionInputSchema.extend({ paymentMethodId })`, reutilizando
  el schema de ítems ya existente.

## Reutilizar

- `src/lib/stripe.ts` — `getStripe()`, `getStoreCurrency()`, `getStripeWebhookSecret()`. No crear otro cliente.
- `src/app/api/webhooks/stripe/route.ts` — se extienden su `switch` y sus helpers `fulfill`/`failPayment`; firma verificada y `Response(null, { status: 204 })` ya están.
- `src/app/api/checkout/session/route.ts` — de ahí sale el helper compartido de carrito (`buildLineItem` se queda); `ConflictError` y sus mensajes se reutilizan tal cual.
- `src/lib/auth.ts` — `requireAuth()`, `getCurrentAppUser()`. `src/lib/constants.ts` — `APP_URL` para `success_url`/`return_url`. `src/lib/api-error.ts` — `handleApiError`, `NotFoundError`, `ConflictError`. `src/lib/audit.ts` — `logAudit(tx, entry)`, `actorId` nullable.
- `src/server/repositories/order.repository.ts` — `createPending`, `decrementStock`, `markPaid`, `markPaymentFailed`, firma `Db | Tx`. `product.repository.ts` — `findManyActiveByIds`. `user.repository.ts` se extiende, no se duplica.
- `src/modules/checkout/schemas/checkout.schema.ts` — `checkoutSessionInputSchema` se extiende, no se reescribe. `hooks/use-create-checkout-session.ts` — mutation que redirige con `window.location.href`.
- `src/modules/orders/services/order.service.ts` + `hooks/use-purchase-history.ts` — patrón service/hook/queryKeys a copiar.
- `src/modules/cart/components/cart-drawer.tsx` — hoy monta `CheckoutButton` (010 T14); ahí entra el selector. `src/app/(storefront)/checkout/success/page.tsx` — hoy lee `session_id`, acepta además `order_id`.
- `src/modules/storefront/lib/profile.ts` — `profileTabSchema`, `PROFILE_SECTIONS`, `profileTabHref` (icono `CreditCard`). `components/profile-empty.tsx` — vacío con CTA, ya extendido en 011.
- `src/modules/storefront/lib/styles.ts` — `CARD`, `PILL`, `PILL_BRAND`, `PILL_QUIET`, `CHIP`, `CHIP_ON`, `TAG`, `MONO`, `FOCUS_RING`.
- `src/components/ui/alert-dialog.tsx`, `skeleton.tsx`, `button.tsx`, `badge.tsx`, `label.tsx` — ya instalados. Sin shadcn nuevos: el selector son `<input type="radio">` nativos con `Label` (no hay `radio-group` y no justifica el bundle).

## Tareas

Bloque A — guardar y administrar tarjetas:

- [x] T1 — Columna `stripeCustomerId` + índice único parcial · `src/server/db/schema/user.ts`
- [x] T2 — Tabla `paymentMethods` (índices, unique parcial de default, check de `exp_month`) + re-export en el barrel · `src/server/db/schema/payment-method.ts`, `src/server/db/schema/index.ts`
- [x] T3 — `orders`: `stripe_checkout_session_id` nullable con unique parcial y unique parcial sobre `stripe_payment_intent_id`; `db:generate` + `db:migrate` de T1–T3 juntos · `src/server/db/schema/order.ts`
- [x] T4 — `setStripeCustomerId(userId, customerId)` y `findStripeCustomerId(userId)` · `src/server/repositories/user.repository.ts`
- [x] T5 — `paymentMethodRepository`: `findManyByUser`, `findByIdForUser`, `upsertFromStripe` (idempotente por `stripe_payment_method_id`; primera tarjeta → default), `setDefault` (tx: limpia la anterior), `deleteForUser` (devuelve la fila y promueve la más reciente si borró la default) · `src/server/repositories/payment-method.repository.ts`
- [x] T6 — Schemas Zod y tipo `PaymentMethod` derivado de la fila del repo · `src/modules/payment-methods/schemas/payment-method.schema.ts`, `src/modules/payment-methods/types/payment-method.ts`
- [x] T7 — `getOrCreateStripeCustomer(user)`: lee la columna, si falta crea el Customer (`metadata.appUserId`) y la persiste · `src/lib/stripe-customer.ts` (`server-only`)
- [x] T8 — `POST /api/payment-methods/setup-session`: `mode: "setup"` con `customer`, `success_url` a `/profile?tab=payment-methods&setup=success` · `src/app/api/payment-methods/setup-session/route.ts`
- [x] T9 — Rama `mode === "setup"` en el webhook: `setupIntents.retrieve(id, { expand: ["payment_method"] })` → `upsertFromStripe` + `logAudit` en una tx · `src/app/api/webhooks/stripe/route.ts`
- [x] T10 — `GET /api/payment-methods` · `src/app/api/payment-methods/route.ts`
- [x] T11 — `PATCH /api/payment-methods/[id]/default` · `src/app/api/payment-methods/[id]/default/route.ts`
- [x] T12 — `DELETE /api/payment-methods/[id]`: `detach` en Stripe, borra la fila, `logAudit` · `src/app/api/payment-methods/[id]/route.ts`
- [x] T13 — `paymentMethodService`: `list()`, `createSetupSession()`, `setDefault(id)`, `remove(id)` · `src/modules/payment-methods/services/payment-method.service.ts`
- [x] T14 — Hooks `usePaymentMethods` (con `paymentMethodKeys`, `enabled` según sesión de Clerk), `useCreateSetupSession`, `useSetDefaultPaymentMethod`, `useDeletePaymentMethod`; las mutations invalidan la lista · `src/modules/payment-methods/hooks/`
- [x] T15 — `PaymentMethodCard`: marca, `•••• last4`, vencimiento, badge de default, acciones y `AlertDialog` de confirmación · `src/modules/payment-methods/components/payment-method-card.tsx`
- [x] T16 — `PaymentMethodList` (`"use client"`): skeleton, error, vacío con CTA, botón "Agregar tarjeta" y aviso "confirmando tu tarjeta" con refetch mientras haya `?setup=success` y la lista no crezca · `src/modules/payment-methods/components/payment-method-list.tsx`
- [x] T17 — Agregar `payment-methods` al enum y a `PROFILE_SECTIONS`, y montar la lista en la rama nueva · `src/modules/storefront/lib/profile.ts`, `src/app/(storefront)/profile/page.tsx`

Bloque B — pagar con tarjeta guardada:

- [x] T18 — Extraer de `checkout/session/route.ts` el helper `resolveCartForPayment(items)`: relee productos, valida stock/disponibilidad (mismos 409) y devuelve `{ lineItems, orderItems, totalCents, currency }`; el handler existente pasa a consumirlo sin cambiar su contrato · `src/server/checkout/resolve-cart.ts`, `src/app/api/checkout/session/route.ts`
- [x] T19 — `payWithSavedInputSchema` y tipo `PayResult` · `src/modules/checkout/schemas/checkout.schema.ts`, `src/modules/checkout/types/order.ts`
- [x] T20 — `orderRepository`: `createPendingForPaymentIntent` (orden sin `stripeCheckoutSessionId`), `markPaidByPaymentIntent` y `markPaymentFailedByPaymentIntent`, ambos idempotentes como sus gemelos por sesión · `src/server/repositories/order.repository.ts`
- [x] T21 — `POST /api/checkout/pay`: resuelve la tarjeta con `findByIdForUser` (404 si no es del usuario), `resolveCartForPayment`, crea la orden `pending` y confirma `paymentIntents.create({ amount, currency, customer, payment_method, confirm: true, return_url, metadata.orderId })`; mapea `succeeded`/`processing` → `processing`, `requires_action` con `redirect_to_url` → `requires_action` + `redirectUrl`, resto → `failed` con el mensaje de Stripe · `src/app/api/checkout/pay/route.ts`
- [x] T22 — Ramas `payment_intent.succeeded` y `payment_intent.payment_failed` en el webhook, reusando `fulfill`/`failPayment` sobre las variantes por PaymentIntent · `src/app/api/webhooks/stripe/route.ts`
- [x] T23 — `checkoutService.payWithSavedMethod(input)` y hook `usePayWithSavedMethod()` (redirige a `redirectUrl` o a `/checkout/success?order_id=…`) · `src/modules/checkout/services/checkout.service.ts`, `src/modules/checkout/hooks/use-pay-with-saved-method.ts`
- [x] T24 — `PaymentMethodPicker`: radios con marca/`last4`, default preseleccionada, opción "Pagar con otra tarjeta"; solo emite `onChange(id | null)` · `src/modules/payment-methods/components/payment-method-picker.tsx`
- [x] T25 — `CheckoutButton` compone el picker: sin tarjetas o con "otra tarjeta" dispara la mutation actual; con tarjeta elegida dispara la nueva; estados de carga y error inline · `src/modules/checkout/components/checkout-button.tsx`, `src/modules/cart/components/cart-drawer.tsx`
- [x] T26 — `/checkout/success` acepta `order_id` además de `session_id` y consulta la orden por id del usuario, con el mismo poll mientras siga `pending` · `src/app/(storefront)/checkout/success/page.tsx`, `src/app/api/orders/[id]/route.ts`

Verificación final: `npm run typecheck && npm run lint`

Ejecutada al cerrar las 26 tareas, los tres comandos en verde (exit code 0):

```
npm run typecheck  → ✓ Types generated successfully · tsc --noEmit sin errores
npm run lint       → eslint sin errores ni warnings
npm run build      → compilado sin errores; rutas nuevas en el manifiesto:
                     ƒ /api/checkout/pay · ƒ /api/orders/[id] ·
                     ƒ /api/payment-methods · ƒ /api/payment-methods/[id] ·
                     ƒ /api/payment-methods/[id]/default ·
                     ƒ /api/payment-methods/setup-session
```

Migración `drizzle/0004_plain_liz_osborn.sql` generada y aplicada con
`npm run db:migrate`.

## Notas

- **Por qué PaymentIntent y no Checkout Session para la tarjeta guardada**: Checkout Session no acepta un `payment_method` preseleccionado (`payment_intent_data` no tiene ese campo); pasarle solo `customer` hace que Stripe muestre las tarjetas en *su* página, no en la nuestra. La skill de Stripe fija la regla: Checkout Sessions para el pago hosteado, PaymentIntents cuando el checkout se modela en la app. Por eso conviven los dos caminos.
- El 3DS se resuelve por redirect (`next_action.redirect_to_url`), que es lo que devuelve Stripe al confirmar en el servidor. Sin Stripe.js no hay forma de atender `use_stripe_sdk`: ese caso cae al flujo hosteado (AC18). Si en producción aparece seguido, el paso siguiente es Payment Element.
- La respuesta de `/api/checkout/pay` nunca marca `paid` aunque el PaymentIntent vuelva `succeeded`: el fulfillment (stock + auditoría) es del webhook, igual que en 010. Lo mismo con el alta: `?setup=success` solo dispara refetch, porque el usuario puede cerrar la pestaña antes de volver.
- `session.setup_intent` llega como string: hace falta `retrieve` con `expand` para leer `payment_method.card`. Tipar `Stripe.PaymentMethod` y verificar `type === "card"` antes de leer `card`.
- `logAudit` de alta/baja de tarjeta: `metadata` solo `{ brand, last4 }`. Nunca el `pm_…` completo ni el `stripe_customer_id` (tokens en un log append-only).
- Hard delete, no soft: una fila "borrada" apuntaría a un PaymentMethod ya desasociado en Stripe. Si `detach` devuelve `resource_missing` la fila se borra igual; otro error de Stripe aborta sin tocar la BD.
- El único-default se apoya en el índice parcial, no solo en el `UPDATE`: dos pestañas marcando default a la vez fallan en el segundo commit en vez de dejar dos.
- Sin `payment_method_types` en ninguna llamada (regla del proyecto y de la skill de Stripe).
