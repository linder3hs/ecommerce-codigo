import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

// Espejo local de Clerk. Clerk manda en autenticación; esta tabla existe para
// colgar la autorización (user_roles) y la autoría de audit_logs.
export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clerkId: varchar("clerk_id", { length: 191 }).notNull(),
    email: varchar("email", { length: 320 }).notNull(),
    firstName: varchar("first_name", { length: 120 }),
    lastName: varchar("last_name", { length: 120 }),
    imageUrl: text("image_url"),
    // Customer de Stripe del comprador. Null hasta que guarda su primera
    // tarjeta: crear un Customer por cada alta de Clerk llenaría Stripe de
    // registros vacíos.
    stripeCustomerId: varchar("stripe_customer_id", { length: 255 }),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("users_clerk_id_unq").on(table.clerkId),
    index("users_email_idx").on(table.email),
    index("users_created_at_idx").on(table.createdAt.desc()),
    // Un Customer de Stripe pertenece a un único usuario. Parcial porque la
    // mayoría de las filas no tiene Customer y no hay razón para indexarlas.
    uniqueIndex("users_stripe_customer_id_unq")
      .on(table.stripeCustomerId)
      .where(sql`${table.stripeCustomerId} is not null`),
  ],
);
