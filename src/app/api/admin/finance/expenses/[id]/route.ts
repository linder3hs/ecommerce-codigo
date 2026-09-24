import { handleApiError, jsonError, NotFoundError } from "@/lib/api-error";
import { logAudit } from "@/lib/audit";
import { getCurrentAppUser } from "@/lib/auth";
import { PERMISSIONS, requirePermission } from "@/lib/permissions";
import {
  expenseIdSchema,
  updateExpenseSchema,
} from "@/modules/finance/schemas/expense.schema";
import { getDb } from "@/server/db";
import { expenseRepository } from "@/server/repositories/expense.repository";

import type { ExpenseRow } from "@/modules/finance/types/expense";
import type {
  ExpenseDbRow,
  ExpenseMutationResult,
} from "@/server/repositories/expense.repository";

const NOT_FOUND_MESSAGE = "El egreso no existe.";

// Lo único que entra al log: los cuatro campos editables. Sin `createdBy` ni
// timestamps, que no cambian por esta vía y `audit_logs` no se puede depurar.
function auditFields(row: ExpenseDbRow) {
  return {
    category: row.category,
    amountCents: row.amountCents,
    expenseDate: row.expenseDate,
    description: row.description,
  };
}

/**
 * Edición auditada de un egreso. El tipo de retorno anotado obliga al `switch`
 * a cubrir todos los `kind` de `ExpenseMutationResult`.
 */
export async function PATCH(
  request: Request,
  ctx: RouteContext<"/api/admin/finance/expenses/[id]">,
): Promise<Response> {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return jsonError(400, "El cuerpo de la petición no es JSON válido.");
  }

  try {
    await requirePermission(PERMISSIONS.EXPENSES_UPDATE);

    const id = expenseIdSchema.parse((await ctx.params).id);
    const input = updateExpenseSchema.parse(body);

    // Se lee ANTES de escribir solo para armar la respuesta: `createdBy` es
    // inmutable, así que el nombre del autor no cambia con esta edición, y
    // fallar después del commit dejaría al cliente con un error sobre un cambio
    // que sí ocurrió. Lo que autoriza la escritura es el `FOR UPDATE` de
    // `update`, que vuelve a comprobar que la fila siga viva.
    const current = await expenseRepository.findById(id);

    if (!current) {
      throw new NotFoundError(NOT_FOUND_MESSAGE);
    }

    const actor = await getCurrentAppUser();

    const result: ExpenseMutationResult = await getDb().transaction(
      async (tx) => {
        const updated = await expenseRepository.update(id, input, tx);

        if (updated.kind === "ok") {
          await logAudit(tx, {
            action: "expense.updated",
            entityType: "expense",
            entityId: id,
            actorId: actor?.id ?? null,
            changes: {
              before: auditFields(updated.before),
              after: auditFields(updated.after),
            },
            severity: "info",
          });
        }

        return updated;
      },
    );

    switch (result.kind) {
      case "ok": {
        const row: ExpenseRow = {
          id: result.after.id,
          category: result.after.category,
          amountCents: result.after.amountCents,
          expenseDate: result.after.expenseDate,
          description: result.after.description,
          createdByName: current.createdByName,
          createdAt: result.after.createdAt.toISOString(),
        };

        return Response.json(row);
      }

      case "not_found":
        throw new NotFoundError(NOT_FOUND_MESSAGE);
    }
  } catch (error: unknown) {
    return handleApiError(error);
  }
}

/**
 * Borrado lógico auditado: la fila queda con `deletedAt` y sale del listado y
 * de las sumas de Ganancias, pero sigue en la tabla. `warning` y no `info`:
 * quitar un gasto cambia el resultado de un periodo ya reportado.
 */
export async function DELETE(
  _request: Request,
  ctx: RouteContext<"/api/admin/finance/expenses/[id]">,
): Promise<Response> {
  try {
    await requirePermission(PERMISSIONS.EXPENSES_DELETE);

    const id = expenseIdSchema.parse((await ctx.params).id);
    const actor = await getCurrentAppUser();

    const result: ExpenseMutationResult = await getDb().transaction(
      async (tx) => {
        const deleted = await expenseRepository.softDelete(id, tx);

        if (deleted.kind === "ok") {
          await logAudit(tx, {
            action: "expense.deleted",
            entityType: "expense",
            entityId: id,
            actorId: actor?.id ?? null,
            changes: { before: auditFields(deleted.before) },
            severity: "warning",
          });
        }

        return deleted;
      },
    );

    switch (result.kind) {
      case "ok":
        return new Response(null, { status: 204 });

      case "not_found":
        throw new NotFoundError(NOT_FOUND_MESSAGE);
    }
  } catch (error: unknown) {
    return handleApiError(error);
  }
}
