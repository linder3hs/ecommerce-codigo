import { api } from "@/lib/axios";

import type { UpdateRolePermissionsInput } from "../schemas/role.schema";
import type { RoleWithPermissions } from "../types/role";

const RESOURCE = "/admin/roles";

export const roleService = {
  async list(): Promise<RoleWithPermissions[]> {
    const { data } = await api.get<RoleWithPermissions[]>(RESOURCE);

    return data;
  },

  // Reemplazo total: el servidor revoca lo que no venga en `permissionIds`.
  async updatePermissions(
    id: string,
    input: UpdateRolePermissionsInput,
  ): Promise<RoleWithPermissions> {
    const { data } = await api.patch<RoleWithPermissions>(
      `${RESOURCE}/${id}/permissions`,
      input,
    );

    return data;
  },
};
