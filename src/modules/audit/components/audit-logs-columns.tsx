import {
  createColumnHelper,
  rowPaginationFeature,
  tableFeatures,
} from "@tanstack/react-table";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import { actionLabel, entityTypeLabel } from "../constants";

import { AuditSeverityBadge } from "./audit-severity-badge";

import type { AuditLogActor, AuditLogListItem } from "../types/audit-log";

// Sin `rowSortingFeature`: el registro se lee siempre por fecha descendente, que
// es el orden que impone el repositorio. No hay orden configurable que exponer.
export const auditLogsTableFeatures = tableFeatures({ rowPaginationFeature });

const dateTimeFormatter = new Intl.DateTimeFormat("es", {
  dateStyle: "medium",
  timeStyle: "short",
});

const helper = createColumnHelper<
  typeof auditLogsTableFeatures,
  AuditLogListItem
>();

/**
 * Las columnas dependen del callback de filtrado por actor, así que se
 * construyen por vista en lugar de vivir en el ámbito del módulo. El consumidor
 * las memoiza.
 */
export function createAuditLogsColumns(
  onFilterByActor: (actor: AuditLogActor) => void,
) {
  return helper.columns([
    helper.accessor("createdAt", {
      header: "Fecha",
      cell: (info) => (
        <span className="text-muted-foreground text-sm whitespace-nowrap">
          {dateTimeFormatter.format(new Date(info.getValue()))}
        </span>
      ),
    }),
    helper.accessor("action", {
      header: "Acción",
      cell: (info) => (
        <span className="font-medium">{actionLabel(info.getValue())}</span>
      ),
    }),
    helper.accessor("entityType", {
      header: "Entidad",
      cell: (info) => (
        <Badge variant="outline">{entityTypeLabel(info.getValue())}</Badge>
      ),
    }),
    helper.accessor("actor", {
      header: "Autor",
      cell: (info) => {
        const actor = info.getValue();

        // `actor` es null en acciones de sistema (webhooks, procesos) o cuando
        // el usuario que la ejecutó se borró: el log sobrevive igual.
        if (!actor) {
          return <span className="text-muted-foreground text-sm">Sistema</span>;
        }

        return (
          <Button
            variant="link"
            className="h-auto p-0 text-sm"
            onClick={() => onFilterByActor(actor)}
            title="Filtrar por este autor"
          >
            {actor.email}
          </Button>
        );
      },
    }),
    helper.accessor("severity", {
      header: "Severidad",
      cell: (info) => <AuditSeverityBadge severity={info.getValue()} />,
    }),
  ]);
}
