import type { InferSelectModel } from "drizzle-orm";

// `import type` es obligatorio: se borra en compilación y evita que drizzle-orm
// llegue al bundle del navegador.
import type { roles } from "@/server/db/schema/role";

import type { Permission } from "./permission";

type RoleRow = InferSelectModel<typeof roles>;

// Los timestamptz llegan al cliente como strings ISO tras el viaje por HTTP.
export type Role = Omit<RoleRow, "createdAt" | "updatedAt"> & {
  createdAt: string;
  updatedAt: string;
};

export type RoleWithPermissions = Role & {
  permissions: Permission[];
};
