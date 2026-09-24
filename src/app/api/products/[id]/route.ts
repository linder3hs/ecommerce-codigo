import {
  handleApiError,
  jsonError,
  NotFoundError,
  SlugConflictError,
} from "@/lib/api-error";
import {
  hasPermission,
  PERMISSIONS,
  requirePermission,
} from "@/lib/permissions";
import { slugify } from "@/lib/utils";
import { redactCost } from "@/modules/finance/lib/cost-redaction";
import {
  productIdSchema,
  updateProductSchema,
} from "@/modules/products/schemas/product.schema";
import { categoryRepository } from "@/server/repositories/category.repository";
import {
  productRepository,
  SKU_TAKEN_MESSAGE,
  SLUG_TAKEN_MESSAGE,
} from "@/server/repositories/product.repository";

const NOT_FOUND_MESSAGE = "El producto no existe.";
const CATEGORY_NOT_FOUND_MESSAGE =
  "La categoría seleccionada no existe o fue eliminada.";

export async function GET(
  _request: Request,
  ctx: RouteContext<"/api/products/[id]">,
) {
  try {
    const actorPermissions = await requirePermission(PERMISSIONS.PRODUCTS_READ);

    const id = productIdSchema.parse((await ctx.params).id);
    const product = await productRepository.findById(id);

    if (!product) {
      throw new NotFoundError(NOT_FOUND_MESSAGE);
    }

    return Response.json(
      redactCost(
        product,
        hasPermission(actorPermissions, PERMISSIONS.PRODUCT_COST_VIEW),
      ),
    );
  } catch (error: unknown) {
    return handleApiError(error);
  }
}

export async function PATCH(
  request: Request,
  ctx: RouteContext<"/api/products/[id]">,
) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return jsonError(400, "El cuerpo de la petición no es JSON válido.");
  }

  try {
    const actorPermissions = await requirePermission(
      PERMISSIONS.PRODUCTS_UPDATE,
    );

    const id = productIdSchema.parse((await ctx.params).id);
    // `updateProductSchema` no admite `costCents`: el costo solo cambia por el
    // `PATCH` auditado de Finanzas. Un `costCents` en este body se descarta.
    const input = updateProductSchema.parse(body);

    const current = await productRepository.findById(id);

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

    if (input.categoryId && input.categoryId !== current.categoryId) {
      const category = await categoryRepository.findById(input.categoryId);

      if (!category) {
        return jsonError(400, CATEGORY_NOT_FOUND_MESSAGE);
      }
    }

    if (
      slug !== current.slug &&
      (await productRepository.existsBySlug(slug, id))
    ) {
      throw new SlugConflictError(SLUG_TAKEN_MESSAGE);
    }

    if (
      input.sku !== undefined &&
      input.sku !== current.sku &&
      (await productRepository.existsBySku(input.sku, id))
    ) {
      return jsonError(409, SKU_TAKEN_MESSAGE);
    }

    const product = await productRepository.update(id, {
      ...(input.name !== undefined ? { name: input.name } : {}),
      slug,
      ...(input.sku !== undefined ? { sku: input.sku } : {}),
      ...(input.description !== undefined
        ? { description: input.description ?? null }
        : {}),
      ...(input.priceCents !== undefined
        ? { priceCents: input.priceCents }
        : {}),
      ...(input.compareAtPriceCents !== undefined
        ? { compareAtPriceCents: input.compareAtPriceCents ?? null }
        : {}),
      ...(input.stock !== undefined ? { stock: input.stock } : {}),
      ...(input.categoryId !== undefined
        ? { categoryId: input.categoryId }
        : {}),
      ...(input.imageUrl !== undefined
        ? { imageUrl: input.imageUrl ?? null }
        : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
    });

    if (!product) {
      throw new NotFoundError(NOT_FOUND_MESSAGE);
    }

    return Response.json(
      redactCost(
        product,
        hasPermission(actorPermissions, PERMISSIONS.PRODUCT_COST_VIEW),
      ),
    );
  } catch (error: unknown) {
    return handleApiError(error);
  }
}

export async function DELETE(
  _request: Request,
  ctx: RouteContext<"/api/products/[id]">,
) {
  try {
    await requirePermission(PERMISSIONS.PRODUCTS_DELETE);

    const id = productIdSchema.parse((await ctx.params).id);
    const deleted = await productRepository.softDelete(id);

    if (!deleted) {
      throw new NotFoundError(NOT_FOUND_MESSAGE);
    }

    return new Response(null, { status: 204 });
  } catch (error: unknown) {
    return handleApiError(error);
  }
}
