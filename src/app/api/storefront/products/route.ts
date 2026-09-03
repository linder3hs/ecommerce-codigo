import { handleApiError } from "@/lib/api-error";
import { publicProductQuerySchema } from "@/modules/products/schemas/public-product.schema";
import { productRepository } from "@/server/repositories/product.repository";
import type { PageMeta } from "@/types/api";

// Catálogo público: lectura anónima de datos ya publicados. Se cachea en el
// borde un minuto y se sirve rancio hasta cinco mientras se revalida, para que
// una ráfaga de visitas no se convierta en una ráfaga de consultas a Neon.
const CACHE_CONTROL = "public, s-maxage=60, stale-while-revalidate=300";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const params = publicProductQuerySchema.parse(
      Object.fromEntries(searchParams.entries()),
    );

    const { rows, total } = await productRepository.listPublic(params);

    const meta: PageMeta = {
      page: params.page,
      pageSize: params.pageSize,
      total,
      totalPages: Math.ceil(total / params.pageSize),
    };

    return Response.json(
      { data: rows, meta },
      { headers: { "Cache-Control": CACHE_CONTROL } },
    );
  } catch (error: unknown) {
    return handleApiError(error);
  }
}
