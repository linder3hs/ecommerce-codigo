import { index, pgTable, primaryKey, uuid } from "drizzle-orm/pg-core";

import { permissions } from "./permission";
import { roles } from "./role";

// Pivote rol ↔ permiso. PK compuesta: un permiso no se concede dos veces al
// mismo rol. CASCADE en ambos lados porque la fila pivote no tiene sentido sin
// sus dos extremos.
export const rolePermissions = pgTable(
  "role_permissions",
  {
    roleId: uuid("role_id")
      .notNull()
      .references(() => roles.id, { onDelete: "cascade" }),
    permissionId: uuid("permission_id")
      .notNull()
      .references(() => permissions.id, { onDelete: "cascade" }),
  },
  (table) => [
    primaryKey({
      name: "role_permissions_pk",
      columns: [table.roleId, table.permissionId],
    }),
    index("role_permissions_permission_id_idx").on(table.permissionId),
  ],
);
