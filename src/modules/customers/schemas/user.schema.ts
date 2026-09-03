import { z } from "zod";

export const userIdSchema = z.uuid(
  "El identificador del usuario no es válido.",
);

export const userQuerySchema = z.object({
  page: z.coerce
    .number("La página debe ser un número.")
    .int("La página debe ser un número entero.")
    .min(1, "La página mínima es 1.")
    .default(1),
  pageSize: z.coerce
    .number("El tamaño de página debe ser un número.")
    .int("El tamaño de página debe ser un número entero.")
    .min(1, "El tamaño de página mínimo es 1.")
    .max(100, "El tamaño de página máximo es 100.")
    .default(10),
  search: z
    .string("La búsqueda debe ser texto.")
    .trim()
    .max(100, "La búsqueda admite máximo 100 caracteres.")
    .optional(),
  isActive: z
    .enum(["true", "false"], "El estado debe ser 'true' o 'false'.")
    .transform((value) => value === "true")
    .optional(),
  roleId: z.uuid("El rol seleccionado no es válido.").optional(),
});

// El rol intencionado viaja por `slug` y no por id: los ids de `roles` son
// aleatorios y cambian entre entornos, y este valor acaba viajando a Clerk
// dentro de `publicMetadata` de la invitación.
export const inviteUserSchema = z.object({
  email: z
    .email("El correo electrónico no es válido.")
    .trim()
    .toLowerCase()
    .max(320, "El correo admite máximo 320 caracteres."),
  roleSlug: z
    .string("Debes elegir un rol para la invitación.")
    .trim()
    .min(1, "Debes elegir un rol para la invitación.")
    .max(64, "El rol seleccionado no es válido."),
});

export const updateUserRoleSchema = z.object({
  roleId: z.uuid("El rol seleccionado no es válido."),
});

export const updateUserStatusSchema = z.object({
  isActive: z.boolean("El estado debe ser verdadero o falso."),
});

export type UserQueryInput = z.infer<typeof userQuerySchema>;
export type InviteUserInput = z.infer<typeof inviteUserSchema>;
export type UpdateUserRoleInput = z.infer<typeof updateUserRoleSchema>;
export type UpdateUserStatusInput = z.infer<typeof updateUserStatusSchema>;
