import { z } from "zod";

export const roleIdSchema = z.uuid("El identificador del rol no es válido.");

// Reemplazo total del set de permisos del rol: lo que no viene en la lista se
// revoca. Un array vacío es válido (rol sin permisos, como `customer`).
export const updateRolePermissionsSchema = z.object({
  permissionIds: z
    .array(
      z.uuid("Uno de los permisos enviados no es válido."),
      "Debes enviar la lista de permisos del rol.",
    )
    .max(200, "La lista de permisos es demasiado larga."),
});

export type UpdateRolePermissionsInput = z.infer<
  typeof updateRolePermissionsSchema
>;
