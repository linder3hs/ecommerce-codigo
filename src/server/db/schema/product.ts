import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { categories } from "./category";

export const products = pgTable(
  "products",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 160 }).notNull(),
    slug: varchar("slug", { length: 180 }).notNull(),
    sku: varchar("sku", { length: 64 }).notNull(),
    description: text("description"),
    priceCents: integer("price_cents").notNull(),
    compareAtPriceCents: integer("compare_at_price_cents"),
    stock: integer("stock").notNull().default(0),
    // RESTRICT: una categoría con productos vivos no se borra por accidente.
    // El borrado de categorías es lógico (deleted_at), así que la FK solo
    // protege contra el DELETE físico hecho por SQL directo.
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "restrict" }),
    imageUrl: text("image_url"),
    isActive: boolean("is_active").notNull().default(true),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("products_slug_active_unq")
      .on(table.slug)
      .where(sql`${table.deletedAt} is null`),
    uniqueIndex("products_sku_active_unq")
      .on(table.sku)
      .where(sql`${table.deletedAt} is null`),
    index("products_category_id_idx").on(table.categoryId),
    index("products_created_at_idx").on(table.createdAt.desc()),
    check("products_price_cents_check", sql`${table.priceCents} >= 0`),
    check(
      "products_compare_at_price_cents_check",
      sql`${table.compareAtPriceCents} is null or ${table.compareAtPriceCents} >= 0`,
    ),
    check("products_stock_check", sql`${table.stock} >= 0`),
  ],
);
