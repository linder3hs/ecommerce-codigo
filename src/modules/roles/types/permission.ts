import type { InferSelectModel } from "drizzle-orm";

// `import type` es obligatorio: se borra en compilación y evita que drizzle-orm
// llegue al bundle del navegador.
import type { permissions } from "@/server/db/schema/permission";

type PermissionRow = InferSelectModel<typeof permissions>;

// El conjunto de campos se deriva del schema Drizzle, pero al viajar por HTTP
// los timestamptz llegan al cliente como strings ISO, no como Date.
export type Permission = Omit<PermissionRow, "createdAt"> & {
  createdAt: string;
};
