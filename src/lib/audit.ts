import "server-only";

import { auditRepository } from "@/server/repositories/audit.repository";

import type { Tx } from "@/server/db";
import type { AuditChanges, AuditMetadata } from "@/server/db/schema/audit-log";
import type { CreateAuditLogData } from "@/server/repositories/audit.repository";

export type AuditEntry = CreateAuditLogData;

export const MASKED_VALUE = "[oculto]";

// Enmascarado por nombre de campo: es la única defensa que no depende de que
// quien llame se acuerde. `audit_logs` es append-only, así que un secreto que
// entra ya no se puede borrar sin romper el contrato de la tabla.
const SENSITIVE_KEY_PATTERN =
  /pass(word)?|secret|token|api[-_]?key|authorization|cookie|session|credential|cvv|card[-_]?number|otp/i;

// Los `changes` guardan objetos planos; el corte evita que una estructura
// ciclada o absurdamente anidada convierta un log en una serialización infinita.
const MAX_DEPTH = 6;

function maskValue(value: unknown, depth: number): unknown {
  if (depth >= MAX_DEPTH) {
    return MASKED_VALUE;
  }

  if (Array.isArray(value)) {
    return value.map((item) => maskValue(item, depth + 1));
  }

  if (value !== null && typeof value === "object") {
    return maskRecord(value as Record<string, unknown>, depth + 1);
  }

  return value;
}

function maskRecord(
  record: Record<string, unknown>,
  depth = 0,
): Record<string, unknown> {
  const masked: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(record)) {
    masked[key] = SENSITIVE_KEY_PATTERN.test(key)
      ? MASKED_VALUE
      : maskValue(value, depth);
  }

  return masked;
}

function maskChanges(changes: AuditChanges | null | undefined) {
  if (!changes) {
    return changes;
  }

  const masked: AuditChanges = {};

  if (changes.before) {
    masked.before = maskRecord(changes.before);
  }

  if (changes.after) {
    masked.after = maskRecord(changes.after);
  }

  return masked;
}

function maskMetadata(metadata: AuditMetadata | null | undefined) {
  return metadata ? maskRecord(metadata) : metadata;
}

/**
 * Registra una acción auditada. Recibe SIEMPRE la transacción de la mutación
 * que audita (regla dura #9): si la mutación revierte, el log revierte con
 * ella, y nunca queda un rastro de algo que no ocurrió. Por eso no resuelve su
 * propio `getDb()`.
 */
export async function logAudit(tx: Tx, entry: AuditEntry): Promise<void> {
  await auditRepository.create(
    {
      ...entry,
      changes: maskChanges(entry.changes),
      metadata: maskMetadata(entry.metadata),
    },
    tx,
  );
}
