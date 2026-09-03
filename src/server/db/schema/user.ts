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
  ],
);
