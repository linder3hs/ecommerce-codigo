import { sql } from "drizzle-orm";
import {
  check,
  date,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { users } from "./user";

// Solo gastos operativos. La compra de inventario no es una categoría a
// propósito: el costo de mercadería sale de `order_items.unit_cost_cents` y
// registrarlo aquí también lo restaría dos veces en Ganancias.
export const expenseCategory = pgEnum("expense_category", [
  "shipping",
  "marketing",
  "payroll",
  "payment_fees",
  "other",
]);

export const expenses = pgTable(
  "expenses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    category: expenseCategory("category").notNull(),
    amountCents: integer("amount_cents").notNull(),
    // `date` y no `timestamptz`: un gasto ocurre en un día de calendario, así
    // no hay deriva de zona horaria y el valor encaja 1:1 con
    // `<input type="date">`. `mode: "string"` lo mantiene como "YYYY-MM-DD" de
    // punta a punta, sin pasar por un `Date` que lo movería de día.
    expenseDate: date("expense_date", { mode: "string" }).notNull(),
    description: text("description"),
    // RESTRICT: un egreso es un hecho contable, igual que `orders.user_id`. Dar
    // de baja una cuenta no borra su historial de gastos.
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
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
    // Parciales: el listado y la suma de Ganancias solo leen filas vivas.
    index("expenses_expense_date_idx")
      .on(table.expenseDate.desc(), table.createdAt.desc())
      .where(sql`${table.deletedAt} is null`),
    index("expenses_category_expense_date_idx")
      .on(table.category, table.expenseDate.desc())
      .where(sql`${table.deletedAt} is null`),
    check("expenses_amount_cents_check", sql`${table.amountCents} > 0`),
  ],
);
