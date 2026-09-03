"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { customerKeys } from "../constants";
import { userService } from "../services/user.service";

import type {
  InviteUserInput,
  UpdateUserRoleInput,
  UpdateUserStatusInput,
} from "../schemas/user.schema";

// Invitar no altera el listado (no hay fila local todavía), pero sí se
// invalida: la invitación puede aceptarse mientras la pantalla sigue abierta.
export function useInviteUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: InviteUserInput) => userService.invite(input),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: customerKeys.lists() }),
  });
}

export function useUpdateUserRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateUserRoleInput }) =>
      userService.updateRole(id, input),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: customerKeys.lists() }),
  });
}

export function useUpdateUserStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateUserStatusInput }) =>
      userService.updateStatus(id, input),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: customerKeys.lists() }),
  });
}
