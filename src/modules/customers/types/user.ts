import type { InferSelectModel } from "drizzle-orm";

// `import type` es obligatorio: se borra en compilación y evita que drizzle-orm
// llegue al bundle del navegador.
import type { users } from "@/server/db/schema/user";
import type { PageMeta } from "@/types/api";

type UserRow = InferSelectModel<typeof users>;

// El conjunto de campos se deriva del schema Drizzle, pero al viajar por HTTP
// los timestamptz llegan al cliente como strings ISO, no como Date.
export type AppUser = Omit<UserRow, "createdAt" | "updatedAt"> & {
  createdAt: string;
  updatedAt: string;
};

export type UserRoleSummary = {
  id: string;
  slug: string;
  name: string;
};

// `role` es `null` mientras el usuario no tenga fila en `user_roles`. Eso no
// significa "sin permisos por defecto": ese default lo resuelve
// `getEffectivePermissions()` en el servidor.
export type UserListItem = AppUser & {
  role: UserRoleSummary | null;
};

export type UserListResponse = {
  data: UserListItem[];
  meta: PageMeta;
};

/**
 * Lo que esta persona puede hacer en la pantalla. Lo resuelve el Server
 * Component desde sus permisos efectivos y solo sirve para ocultar controles:
 * la barrera real es `requirePermission` en cada Route Handler.
 */
export type UserCapabilities = {
  canInvite: boolean;
  canUpdateRole: boolean;
  canDeactivate: boolean;
};

// La invitación vive en Clerk, no en Postgres: hasta que la persona la acepta
// no existe fila local que devolver.
export type UserInvitation = {
  id: string;
  email: string;
  roleSlug: string;
  status: string;
};
