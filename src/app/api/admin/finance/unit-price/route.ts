import { handleApiError } from "@/lib/api-error";
import { PERMISSIONS, requirePermission } from "@/lib/permissions";
import { UNIT_PRICE_DEFAULT_QUERY } from "@/modules/finance/constants";
import { marginCents } from "@/modules/finance/lib/margin";
import { unitPriceQuerySchema } from "@/modules/finance/schemas/unit-price.schema";
import { productRepository } from "@/server/repositories/product.repository";

import type { UnitPriceRow } from "@/modules/finance/types/unit-price";
import type { ProductListRow } from "@/server/repositories/product.repository";
import type { PageMeta } from "@/types/api";

// Proyección: de la fila completa del producto a lo que ve Finanzas. El margen
// absoluto se calcula acá —es una resta de enteros— y el porcentual se deriva en
// el cliente, así por el cable solo viajan centavos.
function toUnitPriceRow(row: ProductListRow): UnitPriceRow {
  return {
    id: row.id,
    name: row.name,
    sku: row.sku,
    category: row.category.name,
    priceCents: row.priceCents,
    costCents: row.costCents,
    marginCents: marginCents(row.priceCents, row.costCents),
  };
}

/**
 * Listado de precio unitario del panel de Finanzas. Solo lectura.
 *
 * Reutiliza `productRepository.list`, que ya pagina, busca por nombre/SKU y
 * resuelve la categoría con un solo join: no hay una segunda definición de
 * "listado de productos" que pueda discrepar de la del panel de catálogo.
 *
 * El gate es `product_cost.view` y no `products.read`: lo que protege este
 * endpoint es el costo, no el catálogo.
 */
export async function GET(request: Request) {
  try {
    await requirePermission(PERMISSIONS.PRODUCT_COST_VIEW);

    const { searchParams } = new URL(request.url);
    const params = unitPriceQuerySchema.parse(
      Object.fromEntries(searchParams.entries()),
    );

    const { rows, total } = await productRepository.list({
      ...params,
      ...UNIT_PRICE_DEFAULT_QUERY,
    });

    const meta: PageMeta = {
      page: params.page,
      pageSize: params.pageSize,
      total,
      totalPages: Math.ceil(total / params.pageSize),
    };

    return Response.json({ data: rows.map(toUnitPriceRow), meta });
  } catch (error: unknown) {
    return handleApiError(error);
  }
}
