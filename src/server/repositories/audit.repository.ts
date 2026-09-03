import "server-only";

import { and, count, desc, eq, gte, lte, type SQL } from "drizzle-orm";

import { getDb, type Db, type Tx } from "@/server/db";
import { auditLogs } from "@/server/db/schema/audit-log";
import { users } from "@/server/db/schema/user";

import type { InferInsertModel, InferSelectModel } from "drizzle-orm";

type AuditLogRow = InferSelectModel<typeof auditLogs>;
type AuditLogInsert = InferInsertModel<typeof auditLogs>;

export type AuditActorSummary = {
  id: string;
  email: string;
};

export type AuditLogListRow = AuditLogRow & {
  actor: AuditActorSummary | null;
};

export type CreateAuditLogData = Pick<AuditLogInsert, "action" | "entityType"> &
  Partial<
    Pick<
      AuditLogInsert,
      | "actorId"
      | "entityId"
      | "changes"
      | "metadata"
      | "ipAddress"
      | "userAgent"
      | "severity"
    >
  >;

export type ListAuditLogsParams = {
  page: number;
  pageSize: number;
  entityType?: string;
  action?: string;
  actorId?: string;
  dateFrom?: Date;
  dateTo?: Date;
};

export type ListAuditLogsResult = {
  rows: AuditLogListRow[];
  total: number;
};

export type AuditSeverity = AuditLogRow["severity"];

export type AuditSeverityCount = {
  severity: AuditSeverity;
  total: number;
};

function buildFilters(params: {
  entityType?: string;
  action?: string;
  actorId?: string;
  dateFrom?: Date;
  dateTo?: Date;
}): SQL | undefined {
  const conditions: SQL[] = [];

  if (params.entityType) {
    conditions.push(eq(auditLogs.entityType, params.entityType));
  }

  if (params.action) {
    conditions.push(eq(auditLogs.action, params.action));
  }

  if (params.actorId) {
    conditions.push(eq(auditLogs.actorId, params.actorId));
  }

  if (params.dateFrom) {
    conditions.push(gte(auditLogs.createdAt, params.dateFrom));
  }

  if (params.dateTo) {
    conditions.push(lte(auditLogs.createdAt, params.dateTo));
  }

  return conditions.length > 0 ? and(...conditions) : undefined;
}

// Append-only por contrato: aquí no hay `update` ni `delete` a propósito. La
// única purga admitida es por retención y es un job, no un request.
export const auditRepository = {
  // Se llama con el `tx` de la mutación auditada: si esta revierte, el log
  // también.
  async create(
    data: CreateAuditLogData,
    db: Db | Tx = getDb(),
  ): Promise<AuditLogRow> {
    const [row] = await db.insert(auditLogs).values(data).returning();

    return row;
  },

  // Un solo leftJoin resuelve el actor de todas las filas (N+1 en otro caso).
  async list(
    params: ListAuditLogsParams,
    db: Db | Tx = getDb(),
  ): Promise<ListAuditLogsResult> {
    const where = buildFilters(params);

    const [rows, totalRows] = await Promise.all([
      db
        .select({
          log: auditLogs,
          actor: { id: users.id, email: users.email },
        })
        .from(auditLogs)
        .leftJoin(users, eq(users.id, auditLogs.actorId))
        .where(where)
        .orderBy(desc(auditLogs.createdAt))
        .limit(params.pageSize)
        .offset((params.page - 1) * params.pageSize),
      db.select({ value: count() }).from(auditLogs).where(where),
    ]);

    return {
      rows: rows.map((row) => ({ ...row.log, actor: row.actor })),
      total: totalRows[0]?.value ?? 0,
    };
  },

  // Agregación en Postgres (`count` + `group by`): traer las filas para
  // contarlas en JS crecería con el volumen del log, que es la tabla que más
  // crece de todo el esquema.
  async countBySeverity(
    since: Date,
    db: Db | Tx = getDb(),
  ): Promise<AuditSeverityCount[]> {
    return db
      .select({ severity: auditLogs.severity, total: count() })
      .from(auditLogs)
      .where(gte(auditLogs.createdAt, since))
      .groupBy(auditLogs.severity);
  },
};
