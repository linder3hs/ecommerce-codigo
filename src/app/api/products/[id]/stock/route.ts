import { handleApiError, jsonError, NotFoundError } from "@/lib/api-error";
import { logAudit } from "@/lib/audit";
import { getCurrentAppUser } from "@/lib/auth";
import { PERMISSIONS, requirePermission } from "@/lib/permissions";
import {
  adjustStockSchema,
  productIdSchema,
} from "@/modules/products/schemas/product.schema";
import { getDb } from "@/server/db";
import { productRepository } from "@/server/repositories/product.repository";

import type { AdjustStockResult } from "@/server/repositories/product.repository";

const NOT_FOUND_MESSAGE = "El producto no existe.";

/**
 * Ajuste rápido de stock por delta con signo. No edita ningún otro campo del
 * producto: para eso está el `PATCH` de `/api/products/[id]`.
 *
 * El tipo de retorno anotado es lo que obliga al `switch` a cubrir todos los
 * `kind` de `AdjustStockResult`: si el repositorio añade uno nuevo, el final de
 * la función pasa a ser alcanzable y TypeScript falla aquí.
 */
export async function PATCH(
  request: Request,
  ctx: RouteContext<"/api/products/[id]/stock">,
): Promise<Response> {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return jsonError(400, "El cuerpo de la petición no es JSON válido.");
  }

  try {
    await requirePermission(PERMISSIONS.PRODUCTS_UPDATE);

    const id = productIdSchema.parse((await ctx.params).id);
    const { delta } = adjustStockSchema.parse(body);

    const actor = await getCurrentAppUser();

    // Regla dura #9: el ajuste y su registro de auditoría en la misma
    // transacción. La tx devuelve el resultado discriminado y la respuesta se
    // decide fuera: un stock insuficiente no es un error a lanzar, es un 400 sin
    // clase propia en `api-error.ts`, y lanzarlo solo para atraparlo revertiría
    // una transacción que no escribió nada.
    const result: AdjustStockResult = await getDb().transaction(async (tx) => {
      const adjusted = await productRepository.adjustStock(id, delta, tx);

      if (adjusted.kind === "ok") {
        await logAudit(tx, {
          action: "product.stock_adjusted",
          entityType: "product",
          entityId: id,
          actorId: actor?.id ?? null,
          // Solo el stock, antes y después, y el delta aplicado: sin nombre,
          // sin SKU y sin precios. `audit_logs` es append-only.
          changes: {
            before: { stock: adjusted.product.stock - delta },
            after: { stock: adjusted.product.stock },
          },
          metadata: { delta },
          // Ajustar inventario es rutina operativa, no una corrección
          // excepcional como el cambio de estado de una orden.
          severity: "info",
        });
      }

      return adjusted;
    });

    switch (result.kind) {
      case "ok":
        return Response.json(result.product);

      case "not_found":
        throw new NotFoundError(NOT_FOUND_MESSAGE);

      case "insufficient":
        return jsonError(
          400,
          `No hay stock suficiente. Stock actual: ${result.current}.`,
        );
    }
  } catch (error: unknown) {
    return handleApiError(error);
  }
}
