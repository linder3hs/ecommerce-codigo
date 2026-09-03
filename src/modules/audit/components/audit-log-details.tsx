import { fieldLabel } from "../constants";

import type { AuditLogListItem } from "../types/audit-log";

const EMPTY = "—";

/**
 * Formatea el valor que quedó guardado, sin interpretarlo: si `logAudit`
 * enmascaró un campo, aquí se muestra la máscara tal cual. Esta pantalla nunca
 * intenta reconstruir el valor original de nada.
 */
function formatValue(value: unknown): string {
  if (value === null || value === undefined) {
    return EMPTY;
  }

  if (typeof value === "boolean") {
    return value ? "Sí" : "No";
  }

  if (Array.isArray(value)) {
    return value.length === 0 ? EMPTY : value.map(formatValue).join(" · ");
  }

  if (typeof value === "object") {
    return JSON.stringify(value);
  }

  return String(value);
}

function changedFields(log: AuditLogListItem): string[] {
  const before = log.changes?.before ?? {};
  const after = log.changes?.after ?? {};

  return Array.from(new Set([...Object.keys(before), ...Object.keys(after)]));
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-0.5">
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className="text-sm break-words">{value}</dd>
    </div>
  );
}

export function AuditLogDetails({ log }: { log: AuditLogListItem }) {
  const fields = changedFields(log);
  const metadataEntries = Object.entries(log.metadata ?? {});
  const hasContext = Boolean(log.entityId || log.ipAddress || log.userAgent);

  if (fields.length === 0 && metadataEntries.length === 0 && !hasContext) {
    return (
      <p className="text-muted-foreground text-sm">
        Esta acción no registró detalle adicional.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {fields.length > 0 ? (
        <section className="flex flex-col gap-2">
          <h3 className="text-sm font-medium">Cambios</h3>
          <div className="overflow-hidden rounded-md border">
            <div className="text-muted-foreground bg-muted/50 grid grid-cols-[minmax(8rem,1fr)_2fr_2fr] gap-3 px-3 py-2 text-xs font-medium">
              <span>Campo</span>
              <span>Antes</span>
              <span>Después</span>
            </div>
            {fields.map((field) => (
              <div
                key={field}
                className="grid grid-cols-[minmax(8rem,1fr)_2fr_2fr] gap-3 border-t px-3 py-2 text-sm"
              >
                <span className="font-medium">{fieldLabel(field)}</span>
                <span className="text-muted-foreground break-words">
                  {formatValue(log.changes?.before?.[field])}
                </span>
                <span className="break-words">
                  {formatValue(log.changes?.after?.[field])}
                </span>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {metadataEntries.length > 0 ? (
        <section className="flex flex-col gap-2">
          <h3 className="text-sm font-medium">Contexto de la acción</h3>
          <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {metadataEntries.map(([key, value]) => (
              <DetailRow
                key={key}
                label={fieldLabel(key)}
                value={formatValue(value)}
              />
            ))}
          </dl>
        </section>
      ) : null}

      {hasContext ? (
        <section className="flex flex-col gap-2">
          <h3 className="text-sm font-medium">Origen</h3>
          <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {log.entityId ? (
              <DetailRow label="Registro afectado" value={log.entityId} />
            ) : null}
            {log.ipAddress ? (
              <DetailRow label="Dirección IP" value={log.ipAddress} />
            ) : null}
            {log.userAgent ? (
              <DetailRow label="Cliente" value={log.userAgent} />
            ) : null}
          </dl>
        </section>
      ) : null}
    </div>
  );
}
