import {
  index,
  inet,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { users } from "./user";

export const auditSeverity = pgEnum("audit_severity", [
  "info",
  "warning",
  "error",
]);

// `changes` guarda solo los campos que cambiaron, ya enmascarados: nunca
// contraseñas, tokens ni datos de tarjeta.
export type AuditChanges = {
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
};

export type AuditMetadata = Record<string, unknown>;

// Append-only: sin UPDATE ni DELETE desde la aplicación. `actor_id` nullable
// porque también registra acciones de sistema, cron y webhooks.
export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    actorId: uuid("actor_id").references(() => users.id, {
      onDelete: "set null",
    }),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id"),
    changes: jsonb("changes").$type<AuditChanges>(),
    metadata: jsonb("metadata").$type<AuditMetadata>(),
    ipAddress: inet("ip_address"),
    userAgent: text("user_agent"),
    severity: auditSeverity("severity").notNull().default("info"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("audit_logs_entity_idx").on(table.entityType, table.entityId),
    index("audit_logs_actor_created_at_idx").on(
      table.actorId,
      table.createdAt.desc(),
    ),
    index("audit_logs_action_idx").on(table.action),
    index("audit_logs_created_at_idx").on(table.createdAt.desc()),
  ],
);
