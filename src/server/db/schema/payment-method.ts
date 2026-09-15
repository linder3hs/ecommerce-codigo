import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  pgTable,
  smallint,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { users } from "./user";

/**
 * Tarjetas guardadas del comprador. La tabla NO guarda datos de tarjeta: el
 * número vive en Stripe y acá solo queda su referencia (`pm_…`) más lo mínimo
 * para dibujarla —marca, últimos cuatro y vencimiento—, que es lo único que
 * Stripe expone y lo único que PCI-DSS permite persistir.
 */
export const paymentMethods = pgTable(
  "payment_methods",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // CASCADE: sin dueño la fila no describe nada. El detach en Stripe lo hace
    // el handler de baja; borrar el usuario es un caso de administración.
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    // Clave de idempotencia del webhook: Stripe entrega at-least-once y el
    // mismo `setup_intent` puede llegar dos veces.
    stripePaymentMethodId: varchar("stripe_payment_method_id", { length: 255 })
      .notNull()
      .unique(),
    brand: varchar("brand", { length: 32 }).notNull(),
    last4: varchar("last4", { length: 4 }).notNull(),
    expMonth: smallint("exp_month").notNull(),
    expYear: smallint("exp_year").notNull(),
    isDefault: boolean("is_default").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("payment_methods_user_id_created_at_idx").on(
      table.userId,
      table.createdAt.desc(),
    ),
    // Una sola predeterminada por usuario, garantizado por Postgres y no solo
    // por el UPDATE: dos pestañas marcando default a la vez fallan en el
    // segundo commit en vez de dejar dos tarjetas marcadas.
    uniqueIndex("payment_methods_user_default_unq")
      .on(table.userId)
      .where(sql`${table.isDefault}`),
    check(
      "payment_methods_exp_month_check",
      sql`${table.expMonth} between 1 and 12`,
    ),
  ],
);
