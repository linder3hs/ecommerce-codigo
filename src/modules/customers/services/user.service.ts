import { api } from "@/lib/axios";

import type {
  InviteUserInput,
  UpdateUserRoleInput,
  UpdateUserStatusInput,
  UserQueryInput,
} from "../schemas/user.schema";
import type {
  UserInvitation,
  UserListItem,
  UserListResponse,
} from "../types/user";

// La ruta se llama `customers` porque es la carpeta reservada del proyecto; el
// recurso de permisos es `users.*` y la etiqueta de UI es "Usuarios".
const RESOURCE = "/admin/customers";

export const userService = {
  async list(params: UserQueryInput): Promise<UserListResponse> {
    const { data } = await api.get<UserListResponse>(RESOURCE, { params });

    return data;
  },

  // Devuelve la invitación de Clerk, no un usuario: la fila local nace cuando
  // la persona acepta y llega el webhook `user.created`.
  async invite(input: InviteUserInput): Promise<UserInvitation> {
    const { data } = await api.post<UserInvitation>(RESOURCE, input);

    return data;
  },

  async updateRole(
    id: string,
    input: UpdateUserRoleInput,
  ): Promise<UserListItem> {
    const { data } = await api.patch<UserListItem>(
      `${RESOURCE}/${id}/role`,
      input,
    );

    return data;
  },

  async updateStatus(
    id: string,
    input: UpdateUserStatusInput,
  ): Promise<UserListItem> {
    const { data } = await api.patch<UserListItem>(
      `${RESOURCE}/${id}/status`,
      input,
    );

    return data;
  },
};
