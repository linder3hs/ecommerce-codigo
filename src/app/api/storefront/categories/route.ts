import { handleApiError } from "@/lib/api-error";
import { publicCategoryQuerySchema } from "@/modules/categories/schemas/public-category.schema";
import { categoryRepository } from "@/server/repositories/category.repository";

// Mismo cacheo que el catálogo público: el menú de categorías cambia todavía
// menos que los productos.
const CACHE_CONTROL = "public, s-maxage=60, stale-while-revalidate=300";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    publicCategoryQuerySchema.parse(
      Object.fromEntries(searchParams.entries()),
    );

    const rows = await categoryRepository.listPublic();

    return Response.json(
      { data: rows },
      { headers: { "Cache-Control": CACHE_CONTROL } },
    );
  } catch (error: unknown) {
    return handleApiError(error);
  }
}
