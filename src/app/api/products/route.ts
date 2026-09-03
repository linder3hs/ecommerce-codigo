import { handleApiError, jsonError, SlugConflictError } from "@/lib/api-error";
import { PERMISSIONS, requirePermission } from "@/lib/permissions";
import { slugify } from "@/lib/utils";
import {
  createProductSchema,
  productQuerySchema,
} from "@/modules/products/schemas/product.schema";
import { categoryRepository } from "@/server/repositories/category.repository";
import {
  productRepository,
  SKU_TAKEN_MESSAGE,
  SLUG_TAKEN_MESSAGE,
} from "@/server/repositories/product.repository";
import type { PageMeta } from "@/types/api";

// Sin `export`: un route file de Next 16 solo admite los métodos HTTP y la
// config de segmento como exports.
const CATEGORY_NOT_FOUND_MESSAGE =
  "La categoría seleccionada no existe o fue eliminada.";

export async function GET(request: Request) {
  try {
    // Dejó de ser público con el spec 004: el storefront lee por
    // `/api/storefront/products`, que devuelve una proyección sin `sku`,
    // `isActive` ni los timestamps. Este listado es el del panel y expone la
    // fila completa, incluidos los productos despublicados.
    await requirePermission(PERMISSIONS.PRODUCTS_READ);

    const { searchParams } = new URL(request.url);
    const params = productQuerySchema.parse(
      Object.fromEntries(searchParams.entries()),
    );

    const { rows, total } = await productRepository.list(params);

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
    await requirePermission(PERMISSIONS.PRODUCTS_CREATE);

    const input = createProductSchema.parse(body);
    const slug = input.slug ?? slugify(input.name);

    if (!slug) {
      return jsonError(
        400,
        "No se pudo generar un slug a partir del nombre. Escribe uno manualmente.",
      );
    }

    // La FK sola devolvería un 500 opaco, y no cubre la categoría soft-deleted:
    // `findById` ya excluye las borradas.
    const category = await categoryRepository.findById(input.categoryId);

    if (!category) {
      return jsonError(400, CATEGORY_NOT_FOUND_MESSAGE);
    }

    if (await productRepository.existsBySlug(slug)) {
      throw new SlugConflictError(SLUG_TAKEN_MESSAGE);
    }

    if (await productRepository.existsBySku(input.sku)) {
      return jsonError(409, SKU_TAKEN_MESSAGE);
    }

    const product = await productRepository.create({
      name: input.name,
      slug,
      sku: input.sku,
      description: input.description ?? null,
      priceCents: input.priceCents,
      compareAtPriceCents: input.compareAtPriceCents ?? null,
      stock: input.stock,
      categoryId: input.categoryId,
      imageUrl: input.imageUrl ?? null,
      isActive: input.isActive,
    });

    return Response.json(product, { status: 201 });
  } catch (error: unknown) {
    return handleApiError(error);
  }
}
