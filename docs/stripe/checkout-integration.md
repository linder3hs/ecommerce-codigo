# Integración con Stripe Checkout

> Documento de referencia, no un spec SDD. Describe cómo conectar el flujo de
> compra actual (carrito Zustand → Route Handlers → Neon) con Stripe
> Checkout en su forma más simple: sesión hosteada por Stripe, pago único,
> métodos de pago dinámicos. No cubre suscripciones, Connect ni Stripe Tax.

## 0. Decisión previa: ¿sincronizar el catálogo con Stripe?

**No, no para este alcance.** El catálogo (`products`, `categories`) se queda
en Neon como fuente única de verdad. La sesión de Checkout se arma con
[`price_data`](https://docs.stripe.com/api/checkout/sessions/create#create_checkout_session-line_items-price_data)
inline por línea, leyendo `priceCents` de la fila del producto en el momento
de crear la sesión — no con un `price_id` de un objeto `Product`/`Price`
pre-creado en Stripe.

Ventajas de no sincronizar:

- Un cambio de precio o de stock en el admin es efectivo al instante; no hay
  segundo sistema que quede desincronizado ni webhook de salida que mantener.
- Menos superficie: no hay que reconciliar `products.id` con `stripe_product_id`
  ni manejar productos borrados/archivados en ambos lados.

Cuándo **sí** conviene sincronizar (no aplica todavía, dejarlo anotado):

- **Suscripciones o billing recurrente**: `subscriptions.create` necesita un
  `Price` ya creado en Stripe, `price_data` inline no sirve para recurrencia.
- **Stripe Tax con código de producto** (`tax_code` por `Price`/`Product`) si
  se activa `automatic_tax`.
- **Reporting o Payment Links por producto** directamente desde el Dashboard
  de Stripe.
- **Venta multicanal** (Stripe también como canal de venta, no solo cobro).

Si alguno de esos casos aparece, ese es el momento de introducir una tabla
`product_stripe_sync` o un job que cree/actualice `Product`/`Price` en Stripe
por cada fila de `products` — no antes.

---

## 1. Alcance de esta integración

- **API**: Checkout Sessions (`mode: "payment"`), pago único. Sesión
  hosteada por Stripe (redirect), no Payment Element embebido.
- **Métodos de pago**: dinámicos. Nunca se pasa `payment_method_types`; se
  administran desde el Dashboard (`Settings → Payment methods`).
- **Fulfillment**: por webhook (`checkout.session.completed` /
  `async_payment_succeeded`), nunca desde la página de éxito.
- **Fuera de alcance**: suscripciones, Stripe Connect, Stripe Tax, guardar
  tarjetas (Setup Intents), Payment Element custom.

---

## 2. Prerrequisitos

- Cuenta de Stripe en **modo test** (el plugin de Stripe ya está conectado en
  esta sesión: `plugin:stripe:stripe`).
- [Stripe CLI](https://docs.stripe.com/cli) instalado para probar webhooks en
  local: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`.
- Definir **una sola moneda** para la tienda. Hoy `products.priceCents` no
  tiene columna de moneda (se asume una implícita). Para Checkout hay que
  fijar una: agregar `STRIPE_CURRENCY` (p. ej. `"usd"` o `"eur"`) a las
  variables de entorno y usarla en todas las `price_data`. Si el proyecto va
  a vender en varias monedas, eso es un spec aparte (columna `currency` en
  `products` + `automatic_tax`/precios por región) — no entra acá.

---

## 3. Dependencias y variables de entorno

Instalar el SDK de servidor (nada de cliente: el flujo es redirect, no hace
falta `@stripe/stripe-js`):

```bash
npm install stripe
```

Agregar a `.env.example` y `.env.local` (siguiendo el mismo patrón que ya usa
`CLERK_WEBHOOK_SIGNING_SECRET` en este proyecto):

```bash
# Stripe
# Restricted key (rk_...), no secret key (sk_...). Permisos mínimos:
# Checkout Sessions (write), Webhook Endpoints (read).
STRIPE_SECRET_KEY=""
# Dashboard → Developers → Webhooks → signing secret. Formato: whsec_...
# En local, lo imprime `stripe listen`.
STRIPE_WEBHOOK_SECRET=""
# Moneda única de la tienda (ver sección 2).
STRIPE_CURRENCY="usd"
```

Reglas de seguridad (no negociables, del skill `stripe-best-practices`):

- **Restricted key (`rk_`)**, no secret key (`sk_`). Crearla en
  `Dashboard → Developers → API keys → Create restricted key` con permisos
  `Checkout Sessions: Write` y `Webhook Endpoints: Read` únicamente.
- Nunca en código ni logs. Solo `process.env.STRIPE_SECRET_KEY`, leído del
  lado servidor (`server-only`, igual que `getDb()`).
- Verificar siempre la firma del webhook (`stripe.webhooks.constructEvent`)
  antes de procesar el evento — igual que `verifyWebhook` en
  `src/app/api/webhooks/clerk/route.ts`.

---

## 4. Modelo de datos

No existe todavía una tabla de órdenes (`src/app/api/orders/` y
`src/app/api/cart/` son placeholders vacíos). Hace falta crear:

### `src/server/db/schema/order.ts`

```ts
export const orderStatusEnum = pgEnum("order_status", [
  "pending", // sesión de Checkout creada, esperando pago
  "paid", // checkout.session.completed con payment_status != unpaid
  "payment_failed", // async_payment_failed
]);

export const orders = pgTable("orders", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(), // Clerk user id, igual que en el resto del proyecto
  status: orderStatusEnum("status").notNull().default("pending"),
  totalCents: integer("total_cents").notNull(),
  currency: varchar("currency", { length: 3 }).notNull(),
  // Idempotencia: el webhook puede reintentar el mismo evento (at-least-once).
  stripeCheckoutSessionId: varchar("stripe_checkout_session_id", {
    length: 255,
  })
    .notNull()
    .unique(),
  stripePaymentIntentId: varchar("stripe_payment_intent_id", { length: 255 }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const orderItems = pgTable("order_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  productId: uuid("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "restrict" }),
  // Snapshot al momento de la compra: si el precio del producto cambia después,
  // la orden histórica no debe cambiar de valor.
  nameSnapshot: varchar("name_snapshot", { length: 160 }).notNull(),
  unitPriceCents: integer("unit_price_cents").notNull(),
  qty: integer("qty").notNull(),
});
```

Correr `npm run db:generate` y `npm run db:migrate` después de escribir el
schema. Registrar ambas tablas en `src/server/db/schema/index.ts`.

### `src/server/repositories/order.repository.ts`

Sigue el mismo patrón que `product.repository.ts` (`server-only`, funciones
puras sobre Drizzle, sin lógica de negocio de Stripe acá). Mínimo necesario:

- `createPending(input, tx?)`: inserta `orders` + `orderItems` en una
  transacción, antes de redirigir a Stripe.
- `markPaid(stripeCheckoutSessionId, stripePaymentIntentId, tx)`: idempotente
  — si ya está `paid`, no hace nada (evita doble descuento de stock en un
  reintento del webhook).
- `markPaymentFailed(stripeCheckoutSessionId)`.
- `decrementStock(items, tx)`: reutiliza la validación de stock existente en
  `product.repository.ts`; corre en la **misma transacción** que `markPaid`.

---

## 5. Flujo end-to-end

```
Cart (Zustand, cliente)
   │  "Pagar" → POST /api/checkout/session  { items: [{ productId, qty }] }
   ▼
Route Handler: src/app/api/checkout/session/route.ts
   │  1. Zod valida el body (solo productId + qty, NUNCA precio del cliente)
   │  2. Lee productos reales desde product.repository (precio, stock, activo)
   │  3. orderRepository.createPending(...)  → status "pending"
   │  4. stripe.checkout.sessions.create({...})  con price_data por línea
   │  5. responde { url: session.url }
   ▼
Cliente redirige a session.url (Stripe hosted)
   │
   ├─ pago exitoso → Stripe redirige a /checkout/success?session_id=...
   ├─ cancelado     → Stripe redirige a /checkout/cancel
   │
   ▼ (en paralelo, servidor a servidor)
POST /api/webhooks/stripe
   │  1. Verifica firma con STRIPE_WEBHOOK_SECRET
   │  2. checkout.session.completed / async_payment_succeeded
   │     (solo si payment_status !== "unpaid")
   │       → orderRepository.markPaid(...) + decrementStock(...) en una tx
   │  3. checkout.session.async_payment_failed
   │       → orderRepository.markPaymentFailed(...)
```

**Por qué el fulfillment vive en el webhook y no en `/checkout/success`**: la
página de éxito no está garantizada — el cliente puede pagar y perder
conexión antes de que la página cargue. Métodos de pago con notificación
demorada (transferencias, algunos wallets) confirman el pago horas después,
cuando el usuario ya cerró el navegador. La página de éxito solo lee el
estado de la orden para mostrarlo; no lo escribe.

### `src/app/api/checkout/session/route.ts` (esqueleto)

```ts
import "server-only";
import Stripe from "stripe";
import { z } from "zod";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const bodySchema = z.object({
  items: z.array(z.object({ productId: z.uuid(), qty: z.number().int().min(1) })).min(1),
});

export async function POST(request: NextRequest) {
  const body = bodySchema.parse(await request.json());

  // Reconstruir precios/stock desde la BD — nunca confiar en lo que mande el cliente.
  const products = await productRepository.findManyByIds(body.items.map((i) => i.productId));
  // ... validar stock, activo, existencia ...

  const order = await orderRepository.createPending({ userId, items: /* ... */ });

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: body.items.map((item) => {
      const product = products.find((p) => p.id === item.productId)!;
      return {
        quantity: item.qty,
        price_data: {
          currency: process.env.STRIPE_CURRENCY!,
          unit_amount: product.priceCents,
          product_data: {
            name: product.name,
            images: product.imageUrl ? [product.imageUrl] : undefined,
          },
        },
      };
    }),
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/checkout/cancel`,
    metadata: { orderId: order.id },
    // integration_identifier: "ecommerce-tech-XXXXXXXX" (sufijo random de 8 letras)
  });

  return Response.json({ url: session.url });
}
```

Notas:

- **Nunca** pasar `payment_method_types`: se omite para habilitar métodos de
  pago dinámicos (Stripe decide qué mostrar según moneda/monto/ubicación).
  Se configuran desde el Dashboard, no desde el código.
- `metadata.orderId` es cómo el webhook encuentra la orden sin depender solo
  del `stripeCheckoutSessionId` (aunque ese también sirve, ver schema).
- `product_data.images` requiere URLs públicas `https://`; revisar
  `src/lib/image-hosts.ts` / `next.config.ts` para confirmar que las imágenes
  de producto ya son accesibles así (deberían serlo, se usan en `<Image>`).

### `src/app/api/webhooks/stripe/route.ts` (esqueleto)

```ts
import "server-only";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(request: NextRequest) {
  const signature = request.headers.get("stripe-signature")!;
  const rawBody = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!,
    );
  } catch {
    return new Response("Invalid signature", { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded": {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.payment_status !== "unpaid") {
        await getDb().transaction(async (tx) => {
          await orderRepository.markPaid(
            session.id,
            session.payment_intent as string,
            tx,
          );
          await orderRepository.decrementStock(session.metadata!.orderId, tx);
        });
      }
      break;
    }
    case "checkout.session.async_payment_failed": {
      const session = event.data.object as Stripe.Checkout.Session;
      await orderRepository.markPaymentFailed(session.id);
      break;
    }
  }

  return new Response(null, { status: 200 });
}
```

Igual que `src/app/api/webhooks/clerk/route.ts`: endpoint público a
propósito (no hay sesión de Clerk detrás de un webhook), la autenticación es
la firma de Stripe. Debe quedar excluido de cualquier chequeo de
`requirePermission` / middleware de auth.

### Páginas de retorno

- `src/app/(storefront)/checkout/success/page.tsx`: lee `session_id` de la
  query, hace `GET /api/orders/[id]` (o consulta directa server component) y
  muestra el estado real de la orden (puede seguir `pending` si el webhook
  todavía no llegó — no asumir "pagado" solo por haber llegado a esta URL).
- `src/app/(storefront)/checkout/cancel/page.tsx`: mensaje simple, vuelve al
  carrito.

---

## 6. Pruebas en local

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
# imprime un whsec_... temporal → copiarlo a STRIPE_WEBHOOK_SECRET en .env.local

stripe trigger checkout.session.completed   # opcional, evento suelto sin sesión real
```

Flujo real de punta a punta: correr `npm run dev`, agregar producto al
carrito, pagar con una tarjeta de prueba (skill `stripe:test-cards` tiene la
lista — `4242 4242 4242 4242` para éxito, cualquier fecha futura/CVC).

---

## 7. Checklist de implementación

1. `npm install stripe`.
2. Variables de entorno (`STRIPE_SECRET_KEY` restringida, `STRIPE_WEBHOOK_SECRET`, `STRIPE_CURRENCY`).
3. Schema `orders` + `order_items` (`src/server/db/schema/order.ts`) → `db:generate` → `db:migrate`.
4. `src/server/repositories/order.repository.ts`.
5. `POST /api/checkout/session` (reemplaza `.gitkeep` en `src/app/api/orders/` o crea `src/app/api/checkout/session/`).
6. `POST /api/webhooks/stripe` con verificación de firma.
7. `/checkout/success` y `/checkout/cancel`.
8. Botón "Pagar" del carrito llama al endpoint y redirige a `session.url`.
9. Probar con `stripe listen` + tarjetas de prueba, incluyendo un pago que falle.
10. Antes de producción: RAK live-mode, revisar el [Go Live Checklist de Stripe](https://docs.stripe.com/get-started/checklist/go-live.md).

## 8. Explícitamente fuera de este documento

- Sincronizar `products`/`categories` con `Product`/`Price` de Stripe (ver sección 0).
- Suscripciones / billing recurrente.
- Stripe Tax / registrations.
- Stripe Connect / marketplace.
- Guardar métodos de pago (Setup Intents) para compras futuras.
- Multi-moneda.
