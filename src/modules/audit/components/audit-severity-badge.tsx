import { Badge } from "@/components/ui/badge";

import { severityLabel } from "../constants";

import type { AuditSeverity } from "../types/audit-log";
import type { ComponentProps } from "react";

type BadgeVariant = NonNullable<ComponentProps<typeof Badge>["variant"]>;

const SEVERITY_VARIANTS: Record<AuditSeverity, BadgeVariant> = {
  info: "secondary",
  warning: "outline",
  error: "destructive",
};

export function AuditSeverityBadge({ severity }: { severity: AuditSeverity }) {
  return (
    <Badge variant={SEVERITY_VARIANTS[severity]}>
      {severityLabel(severity)}
    </Badge>
  );
}
