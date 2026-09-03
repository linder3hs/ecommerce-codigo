import type { InferSelectModel } from "drizzle-orm";

// `import type` es obligatorio: se borra en compilación y evita que drizzle-orm
// llegue al bundle del navegador.
import type { auditLogs } from "@/server/db/schema/audit-log";
import type { PageMeta } from "@/types/api";

type AuditLogRow = InferSelectModel<typeof auditLogs>;

export type AuditSeverity = AuditLogRow["severity"];

// El conjunto de campos se deriva del schema Drizzle, pero al viajar por HTTP
// los timestamptz llegan al cliente como strings ISO, no como Date.
export type AuditLog = Omit<AuditLogRow, "createdAt"> & {
  createdAt: string;
};

// Solo id y correo: el actor se resuelve con el leftJoin del repositorio y la
// pantalla no necesita más de él. Es `null` en acciones de sistema o cuando el
// usuario que la ejecutó ya no existe.
export type AuditLogActor = {
  id: string;
  email: string;
};

export type AuditLogListItem = AuditLog & {
  actor: AuditLogActor | null;
};

export type AuditLogListResponse = {
  data: AuditLogListItem[];
  meta: PageMeta;
};
