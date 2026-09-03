export const roleKeys = {
  all: ["roles"] as const,
  lists: () => [...roleKeys.all, "list"] as const,
  list: () => [...roleKeys.lists()] as const,
  details: () => [...roleKeys.all, "detail"] as const,
  detail: (id: string) => [...roleKeys.details(), id] as const,
};

export const permissionKeys = {
  all: ["permissions"] as const,
  lists: () => [...permissionKeys.all, "list"] as const,
  list: () => [...permissionKeys.lists()] as const,
};

// La matriz agrupa por `resource` y la persona no debe leer nunca el nombre
// técnico del recurso. Lo que no esté aquí cae al propio `resource` como último
// recurso, que solo pasaría con un permiso sembrado fuera del catálogo.
export const RESOURCE_LABELS: Record<string, string> = {
  panel: "Panel de administración",
  categories: "Categorías",
  products: "Productos",
  orders: "Pedidos",
  users: "Usuarios",
  roles: "Roles y permisos",
  audit_logs: "Auditoría",
  metrics: "Métricas",
};

export function resourceLabel(resource: string): string {
  return RESOURCE_LABELS[resource] ?? resource;
}
