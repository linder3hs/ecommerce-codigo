import { handleApiError, jsonError, SlugConflictError } from "@/lib/api-error";
import { PERMISSIONS, requirePermission } from "@/lib/permissions";
import { slugify } from "@/lib/utils";
import {
  categoryQuerySchema,
  createCategorySchema,
} from "@/modules/categories/schemas/category.schema";
import type { PageMeta } from "@/modules/categories/types/category";
import {
  categoryRepository,
  SLUG_TAKEN_MESSAGE,
} from "@/server/repositories/category.repository";

export async function GET(request: Request) {
  try {
    // Dejó de ser público con el spec 004: el storefront lee por
    // `/api/storefront/categories`, que devuelve solo las activas y sin
    // columnas internas. Este listado es el del panel.
    await requirePermission(PERMISSIONS.CATEGORIES_READ);

    const { searchParams } = new URL(request.url);
    const params = categoryQuerySchema.parse(
      Object.fromEntries(searchParams.entries()),
    );

    const { rows, total } = await categoryRepository.list(params);

    const meta: PageMeta = {
      page: params.page,
      pageSize: params.pageSize,
      total,
      totalPages: Math.ceil(total / params.pageSize),
    };

    return Response.json({ data: rows, meta });
  } catch (error: unknown) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return jsonError(400, "El cuerpo de la petición no es JSON válido.");
  }

  try {
    // Capa 3, la que manda: 401 sin sesión, 403 sin el permiso.
    await requirePermission(PERMISSIONS.CATEGORIES_CREATE);

    const input = createCategorySchema.parse(body);
    const slug = input.slug ?? slugify(input.name);

    if (!slug) {
      return jsonError(
        400,
        "No se pudo generar un slug a partir del nombre. Escribe uno manualmente.",
      );
    }

    if (await categoryRepository.existsBySlug(slug)) {
      throw new SlugConflictError(SLUG_TAKEN_MESSAGE);
    }

    const category = await categoryRepository.create({
      name: input.name,
      slug,
      description: input.description ?? null,
      imageUrl: input.imageUrl ?? null,
      isActive: input.isActive,
    });

    return Response.json(category, { status: 201 });
  } catch (error: unknown) {
    return handleApiError(error);
  }
}
