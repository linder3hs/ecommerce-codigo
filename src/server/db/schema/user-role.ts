import {
  index,
  pgTable,
  primaryKey,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { roles } from "./role";
import { users } from "./user";

// Pivote usuario ↔ rol. PK compuesta. `assigned_by` es nullable y usa
// `set null` para no perder la asignación si el actor se borra; la traza
// completa de quién la hizo vive en `audit_logs`.
export const userRoles = pgTable(
  "user_roles",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    roleId: uuid("role_id")
      .notNull()
      .references(() => roles.id, { onDelete: "cascade" }),
    assignedBy: uuid("assigned_by").references(() => users.id, {
      onDelete: "set null",
    }),
    assignedAt: timestamp("assigned_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({
      name: "user_roles_pk",
      columns: [table.userId, table.roleId],
    }),
    index("user_roles_role_id_idx").on(table.roleId),
  ],
);
