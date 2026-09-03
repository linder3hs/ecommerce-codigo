import {
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

// Tabla semilla: los permisos nacen del código, nunca de la UI. `code` es
// siempre `<resource>.<action>` y es la única forma válida de autorizar.
// `description` va en español: es lo que lee la persona en la matriz de roles.
export const permissions = pgTable(
  "permissions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    code: varchar("code", { length: 96 }).notNull(),
    resource: varchar("resource", { length: 48 }).notNull(),
    action: varchar("action", { length: 48 }).notNull(),
    description: text("description"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("permissions_code_unq").on(table.code),
    index("permissions_resource_idx").on(table.resource),
  ],
);
