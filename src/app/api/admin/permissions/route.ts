import { handleApiError } from "@/lib/api-error";
import { PERMISSIONS, requirePermission } from "@/lib/permissions";
import { permissionRepository } from "@/server/repositories/permission.repository";

// Catálogo completo de permisos (tabla semilla, solo lectura). Lo consume la
// matriz para pintar las filas que un rol todavía no tiene.
export async function GET() {
  try {
    await requirePermission(PERMISSIONS.ROLES_READ);

    const permissions = await permissionRepository.listAll();

    return Response.json(permissions);
  } catch (error: unknown) {
    return handleApiError(error);
  }
}
