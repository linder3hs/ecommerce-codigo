"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { roleKeys } from "../constants";
import { roleService } from "../services/role.service";

import type { UpdateRolePermissionsInput } from "../schemas/role.schema";

export function useUpdateRolePermissions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: string;
      input: UpdateRolePermissionsInput;
    }) => roleService.updatePermissions(id, input),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: roleKeys.lists() }),
  });
}
