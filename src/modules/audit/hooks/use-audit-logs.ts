"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { auditKeys } from "../constants";
import { auditLogService } from "../services/audit-log.service";

import type { AuditLogQueryInput } from "../schemas/audit-log.schema";

export function useAuditLogs(params: AuditLogQueryInput) {
  return useQuery({
    queryKey: auditKeys.list(params),
    queryFn: () => auditLogService.list(params),
    placeholderData: keepPreviousData,
  });
}
