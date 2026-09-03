import {
  handleApiError,
  jsonError,
  NotFoundError,
  SlugConflictError,
} from "@/lib/api-error";
import { PERMISSIONS, requirePermission } from "@/lib/permissions";
import { slugify } from "@/lib/utils";
import {
  categoryIdSchema,
  updateCategorySchema,
} from "@/modules/categories/schemas/category.schema";
import {
  categoryRepository,
  SLUG_TAKEN_MESSAGE,
} from "@/server/repositories/category.repository";

const NOT_FOUND_MESSAGE = "La categoría no existe.";

export async function GET(
  _request: Request,
  ctx: RouteContext<"/api/categories/[id]">,
) {
  try {
    const id = categoryIdSchema.parse((await ctx.params).id);
    const category = await categoryRepository.findById(id);

    if (!category) {
      throw new NotFoundError(NOT_FOUND_MESSAGE);
    }

    return Response.json(category);
  } catch (error: unknown) {
    return handleApiError(error);
  }
}

export async function PATCH(
  request: Request,
  ctx: RouteContext<"/api/categories/[id]">,
) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return jsonError(400, "El cuerpo de la petición no es JSON válido.");
  }

  try {
    await requirePermission(PERMISSIONS.CATEGORIES_UPDATE);

    const id = categoryIdSchema.parse((await ctx.params).id);
    const input = updateCategorySchema.parse(body);

    const current = await categoryRepository.findById(id);

    if (!current) {
      throw new NotFoundError(NOT_FOUND_MESSAGE);
    }

    const slug =
      input.slug ?? (input.name ? slugify(input.name) : current.slug);

    if (!slug) {
      return jsonError(
        400,
        "No se pudo generar un slug a partir del nombre. Escribe uno manualmente.",
      );
    }

    if (
      slug !== current.slug &&
      (await categoryRepository.existsBySlug(slug, id))
    ) {
      throw new SlugConflictError(SLUG_TAKEN_MESSAGE);
    }

    const category = await categoryRepository.update(id, {
      ...(input.name !== undefined ? { name: input.name } : {}),
      slug,
      ...(input.description !== undefined
        ? { description: input.description ?? null }
        : {}),
      ...(input.imageUrl !== undefined
        ? { imageUrl: input.imageUrl ?? null }
        : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
    });

    if (!category) {
      throw new NotFoundError(NOT_FOUND_MESSAGE);
    }

    return Response.json(category);
  } catch (error: unknown) {
    return handleApiError(error);
  }
}

export async function DELETE(
  _request: Request,
  ctx: RouteContext<"/api/categories/[id]">,
) {
  try {
    await requirePermission(PERMISSIONS.CATEGORIES_DELETE);

    const id = categoryIdSchema.parse((await ctx.params).id);
    const deleted = await categoryRepository.softDelete(id);

    if (!deleted) {
      throw new NotFoundError(NOT_FOUND_MESSAGE);
    }

    return new Response(null, { status: 204 });
  } catch (error: unknown) {
    return handleApiError(error);
  }
}
