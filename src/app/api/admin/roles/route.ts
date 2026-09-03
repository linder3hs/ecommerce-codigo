import { handleApiError } from "@/lib/api-error";
import { PERMISSIONS, requirePermission } from "@/lib/permissions";
import { roleRepository } from "@/server/repositories/role.repository";

// Lista los 6 roles del sistema con su set de permisos actual. Sin query params:
// el catálogo es cerrado y cabe entero en una respuesta.
export async function GET() {
  try {
    await requirePermission(PERMISSIONS.ROLES_READ);

    const roles = await roleRepository.listWithPermissions();

    return Response.json(roles);
  } catch (error: unknown) {
    return handleApiError(error);
  }
}
