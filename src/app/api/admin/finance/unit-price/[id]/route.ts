import { handleApiError, jsonError, NotFoundError } from "@/lib/api-error";
import { logAudit } from "@/lib/audit";
import { getCurrentAppUser } from "@/lib/auth";
import { PERMISSIONS, requirePermission } from "@/lib/permissions";
import { marginCents } from "@/modules/finance/lib/margin";
import { updateCostSchema } from "@/modules/finance/schemas/unit-price.schema";
import { productIdSchema } from "@/modules/products/schemas/product.schema";
import { getDb } from "@/server/db";
import { categoryRepository } from "@/server/repositories/category.repository";
import { productRepository } from "@/server/repositories/product.repository";

import type { UnitPriceRow } from "@/modules/finance/types/unit-price";
import type { UpdateCostResult } from "@/server/repositories/product.repository";

const NOT_FOUND_MESSAGE = "El producto no existe.";

/**
 * Única vía para cambiar el costo de un producto, y por eso la auditada: el
 * `PATCH` genérico de `/api/products/[id]` omite `costCents` a propósito.
 *
 * El tipo de retorno anotado es lo que obliga al `switch` a cubrir todos los
 * `kind` de `UpdateCostResult`: si el repositorio añade uno nuevo, el final de
 * la función pasa a ser alcanzable y TypeScript falla aquí.
 */
export async function PATCH(
  request: Request,
  ctx: RouteContext<"/api/admin/finance/unit-price/[id]">,
): Promise<Response> {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return jsonError(400, "El cuerpo de la petición no es JSON válido.");
  }

  try {
    await requirePermission(PERMISSIONS.PRODUCT_COST_UPDATE);

    const id = productIdSchema.parse((await ctx.params).id);
    const { costCents } = updateCostSchema.parse(body);

    // La categoría se resuelve ANTES de escribir: la respuesta es una
    // `UnitPriceRow` y necesita su nombre, y fallar después de haber
    // confirmado la transacción dejaría al cliente con un error sobre un
    // cambio que sí ocurrió. `updateCost` vuelve a comprobar la existencia del
    // producto dentro de la transacción, que es lo que de verdad autoriza la
    // escritura; esta lectura previa solo arma la respuesta.
    const current = await productRepository.findById(id);

    if (!current) {
      throw new NotFoundError(NOT_FOUND_MESSAGE);
    }

    const category = await categoryRepository.findById(current.categoryId);

    if (!category) {
      throw new NotFoundError(
        "La categoría del producto fue eliminada. Reasígnala antes de editar su costo.",
      );
    }

    const actor = await getCurrentAppUser();

    // Regla dura #9: el cambio de costo y su registro de auditoría en la misma
    // transacción. El resultado discriminado sale de la tx y la respuesta se
    // decide fuera: "el costo ya era ese" no es un error a lanzar —es un 400—, y
    // lanzarlo solo para atraparlo revertiría una transacción que no escribió
    // nada.
    const result: UpdateCostResult = await getDb().transaction(async (tx) => {
      const updated = await productRepository.updateCost(id, costCents, tx);

      if (updated.kind === "ok") {
        await logAudit(tx, {
          action: "product.cost_updated",
          entityType: "product",
          entityId: id,
          actorId: actor?.id ?? null,
          // Solo el costo, antes y después. Sin nombre, sin SKU y sin precio:
          // `audit_logs` es append-only y lo que entra no se borra.
          changes: {
            before: { costCents: updated.before.costCents },
            after: { costCents: updated.after.costCents },
          },
          // Corregir el costo es rutina operativa, igual que ajustar inventario.
          severity: "info",
        });
      }

      return updated;
    });

    switch (result.kind) {
      case "ok": {
        const row: UnitPriceRow = {
          id: result.after.id,
          name: result.after.name,
          sku: result.after.sku,
          category: category.name,
          priceCents: result.after.priceCents,
          costCents: result.after.costCents,
          marginCents: marginCents(
            result.after.priceCents,
            result.after.costCents,
          ),
        };

        return Response.json(row);
      }

      case "not_found":
        throw new NotFoundError(NOT_FOUND_MESSAGE);

      case "unchanged":
        return jsonError(400, "El costo ya tenía ese valor.");
    }
  } catch (error: unknown) {
    return handleApiError(error);
  }
}
