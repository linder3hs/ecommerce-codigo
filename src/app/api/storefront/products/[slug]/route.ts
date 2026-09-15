import { handleApiError, NotFoundError } from "@/lib/api-error";
import { publicProductSlugSchema } from "@/modules/products/schemas/public-product.schema";
import { productRepository } from "@/server/repositories/product.repository";

// Mismo encabezado que el listado público: la ficha también es lectura anónima
// de datos publicados y no tiene por qué golpear Neon en cada visita.
const CACHE_CONTROL = "public, s-maxage=60, stale-while-revalidate=300";

const NOT_FOUND_MESSAGE = "El producto no existe.";

export async function GET(
  _request: Request,
  ctx: RouteContext<"/api/storefront/products/[slug]">,
) {
  try {
    const slug = publicProductSlugSchema.parse((await ctx.params).slug);
    const product = await productRepository.findPublicBySlug(slug);

    if (!product) {
      throw new NotFoundError(NOT_FOUND_MESSAGE);
    }

    return Response.json(
      { data: product },
      { headers: { "Cache-Control": CACHE_CONTROL } },
    );
  } catch (error: unknown) {
    return handleApiError(error);
  }
}
