import { api } from "@/lib/axios";

import type { Permission } from "../types/permission";

const RESOURCE = "/admin/permissions";

export const permissionService = {
  async list(): Promise<Permission[]> {
    const { data } = await api.get<Permission[]>(RESOURCE);

    return data;
  },
};
