import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  pgEnum,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { products } from "./product";
import { users } from "./user";

export const orderStatus = pgEnum("order_status", [
  // Sesión de Checkout creada, esperando el pago.
  "pending",
  // `checkout.session.completed` con `payment_status` distinto de `unpaid`.
  "paid",
  // `checkout.session.async_payment_failed`.
  "payment_failed",
]);

// El importe y la moneda se guardan en la orden y no se recalculan: cambiar el
// precio de un producto o `STRIPE_CURRENCY` no puede reescribir una compra ya
// hecha.
export const orders = pgTable(
  "orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // RESTRICT: una orden es un hecho contable y no desaparece porque alguien
    // borre su usuario. El baja de cuenta desactiva el espejo (`is_active`).
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    status: orderStatus("status").notNull().default("pending"),
    totalCents: integer("total_cents").notNull(),
    currency: varchar("currency", { length: 3 }).notNull(),
    // Nullable: el pago con tarjeta guardada confirma un PaymentIntent en el
    // servidor y no abre ninguna sesión de Checkout. Cuando existe es única y
    // es la clave de idempotencia del webhook hosteado, que Stripe entrega
    // at-least-once y puede reenviar el mismo evento varias veces.
    stripeCheckoutSessionId: varchar("stripe_checkout_session_id", {
      length: 255,
    }),
    stripePaymentIntentId: varchar("stripe_payment_intent_id", { length: 255 }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("orders_user_id_created_at_idx").on(
      table.userId,
      table.createdAt.desc(),
    ),
    // Uniques parciales: los dos identificadores de Stripe son opcionales
    // —cada camino de pago llena uno— y son la idempotencia de su webhook.
    uniqueIndex("orders_stripe_checkout_session_id_unq")
      .on(table.stripeCheckoutSessionId)
      .where(sql`${table.stripeCheckoutSessionId} is not null`),
    uniqueIndex("orders_stripe_payment_intent_id_unq")
      .on(table.stripePaymentIntentId)
      .where(sql`${table.stripePaymentIntentId} is not null`),
    check("orders_total_cents_check", sql`${table.totalCents} >= 0`),
  ],
);

// Snapshot de la línea al momento de la compra: nombre y precio unitario se
// copian para que un cambio posterior en `products` no altere el histórico.
export const orderItems = pgTable(
  "order_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "restrict" }),
    nameSnapshot: varchar("name_snapshot", { length: 160 }).notNull(),
    unitPriceCents: integer("unit_price_cents").notNull(),
    qty: integer("qty").notNull(),
  },
  (table) => [
    index("order_items_order_id_idx").on(table.orderId),
    check("order_items_qty_check", sql`${table.qty} > 0`),
    check(
      "order_items_unit_price_cents_check",
      sql`${table.unitPriceCents} >= 0`,
    ),
  ],
);
