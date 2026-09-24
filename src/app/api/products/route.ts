import {
  ForbiddenError,
  handleApiError,
  jsonError,
  SlugConflictError,
} from "@/lib/api-error";
import {
  hasPermission,
  PERMISSIONS,
  requirePermission,
} from "@/lib/permissions";
import { slugify } from "@/lib/utils";
// Solo servidor: el umbral se define una vez en el módulo de dashboard y este
// handler lo aplica al filtro, para que el cliente mande una bandera y no un
// número que podría manipular.
import { LOW_STOCK_THRESHOLD } from "@/modules/dashboard/constants";
import { redactCost } from "@/modules/finance/lib/cost-redaction";
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
    // `requirePermission` devuelve el set efectivo del actor: el costo se
    // redacta con ese mismo resultado, sin una segunda consulta.
    const actorPermissions = await requirePermission(PERMISSIONS.PRODUCTS_READ);
    const canViewCost = hasPermission(
      actorPermissions,
      PERMISSIONS.PRODUCT_COST_VIEW,
    );

    const { searchParams } = new URL(request.url);
    const params = productQuerySchema.parse(
      Object.fromEntries(searchParams.entries()),
    );

    const { lowStockOnly, ...filters } = params;

    const { rows, total } = await productRepository.list({
      ...filters,
      maxStock: lowStockOnly ? LOW_STOCK_THRESHOLD : undefined,
    });

    const meta: PageMeta = {
      page: params.page,
      pageSize: params.pageSize,
      total,
      totalPages: Math.ceil(total / params.pageSize),
    };

    return Response.json({
      data: rows.map((row) => redactCost(row, canViewCost)),
      meta,
    });
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
    const actorPermissions = await requirePermission(
      PERMISSIONS.PRODUCTS_CREATE,
    );
    const canEditCost = hasPermission(
      actorPermissions,
      PERMISSIONS.PRODUCT_COST_UPDATE,
    );

    const input = createProductSchema.parse(body);

    // Solo un costo numérico exige el permiso: `null` y la ausencia del campo
    // son el valor por defecto de la columna —costo desconocido— y no cargan
    // ningún dato de costo, así que crear productos sin tocar el costo sigue
    // siendo posible con solo `products.create`.
    if (typeof input.costCents === "number" && !canEditCost) {
      throw new ForbiddenError("No tienes permiso para definir el costo.");
    }

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
      costCents: input.costCents ?? null,
      stock: input.stock,
      categoryId: input.categoryId,
      imageUrl: input.imageUrl ?? null,
      isActive: input.isActive,
    });

    // Quien puede escribir el costo no necesariamente puede leerlo: la respuesta
    // se redacta con `product_cost.view`, igual que el resto de las filas.
    return Response.json(
      redactCost(
        product,
        hasPermission(actorPermissions, PERMISSIONS.PRODUCT_COST_VIEW),
      ),
      { status: 201 },
    );
  } catch (error: unknown) {
    return handleApiError(error);
  }
}
