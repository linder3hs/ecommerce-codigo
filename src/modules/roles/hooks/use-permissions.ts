"use client";

import { useQuery } from "@tanstack/react-query";

import { permissionKeys } from "../constants";
import { permissionService } from "../services/permission.service";

// El catálogo es tabla semilla: no cambia entre navegaciones, de ahí el
// `staleTime` alto en lugar de refetch por montaje.
const CATALOG_STALE_TIME_MS = 5 * 60 * 1000;

export function usePermissions() {
  return useQuery({
    queryKey: permissionKeys.list(),
    queryFn: () => permissionService.list(),
    staleTime: CATALOG_STALE_TIME_MS,
  });
}
