"use client";

import { useQuery } from "@tanstack/react-query";

import { roleKeys } from "../constants";
import { roleService } from "../services/role.service";

export function useRoles() {
  return useQuery({
    queryKey: roleKeys.list(),
    queryFn: () => roleService.list(),
  });
}
