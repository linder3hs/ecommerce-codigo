import { ForbiddenError, handleApiError, jsonError } from "@/lib/api-error";
import { logAudit } from "@/lib/audit";
import { getCurrentAppUser } from "@/lib/auth";
import { formatCustomerName } from "@/lib/format";
import { PERMISSIONS, requirePermission } from "@/lib/permissions";
import {
  createExpenseSchema,
  expenseQuerySchema,
} from "@/modules/finance/schemas/expense.schema";
import { getDb } from "@/server/db";
import { expenseRepository } from "@/server/repositories/expense.repository";

import type { ExpenseRow } from "@/modules/finance/types/expense";
import type { ExpenseListRow } from "@/server/repositories/expense.repository";
import type { PageMeta } from "@/types/api";

// Proyección al cable: campos nombrados uno a uno para que una columna interna
// nueva no se filtre por descuido.
function toExpenseRow(row: ExpenseListRow): ExpenseRow {
  return {
    id: row.id,
    category: row.category,
    amountCents: row.amountCents,
    expenseDate: row.expenseDate,
    description: row.description,
    createdByName: row.createdByName,
    createdAt: row.createdAt.toISOString(),
  };
}

/**
 * Listado de egresos vivos, paginado y filtrable por categoría y rango de días.
 * `dateTo` anterior a `dateFrom` es 400 por el `refine` del schema.
 */
export async function GET(request: Request) {
  try {
    await requirePermission(PERMISSIONS.EXPENSES_VIEW);

    const { searchParams } = new URL(request.url);
    const params = expenseQuerySchema.parse(
      Object.fromEntries(searchParams.entries()),
    );

    const { rows, total } = await expenseRepository.list(params);

    const meta: PageMeta = {
      page: params.page,
      pageSize: params.pageSize,
      total,
      totalPages: Math.ceil(total / params.pageSize),
    };

    return Response.json({ data: rows.map(toExpenseRow), meta });
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
    await requirePermission(PERMISSIONS.EXPENSES_CREATE);

    const input = createExpenseSchema.parse(body);

    // El autor sale de la sesión, nunca del body. `getCurrentAppUser` es
    // nullable (el espejo de Clerk puede ir detrás) y `created_by` no lo es:
    // sin fila local no hay a quién atribuir el gasto.
    const actor = await getCurrentAppUser();

    if (!actor) {
      throw new ForbiddenError(
        "Tu cuenta aún no está sincronizada. Intenta de nuevo en unos segundos.",
      );
    }

    // Regla dura #9: el alta y su registro de auditoría en la misma
    // transacción.
    const created = await getDb().transaction(async (tx) => {
      const row = await expenseRepository.create(
        { ...input, createdBy: actor.id },
        tx,
      );

      await logAudit(tx, {
        action: "expense.created",
        entityType: "expense",
        entityId: row.id,
        actorId: actor.id,
        changes: {
          after: {
            category: row.category,
            amountCents: row.amountCents,
            expenseDate: row.expenseDate,
            description: row.description,
          },
        },
        severity: "info",
      });

      return row;
    });

    // El nombre del autor sale del actor ya leído: es quien acaba de crear la
    // fila, y releerla tras el commit solo repetiría el join.
    const row = toExpenseRow({
      ...created,
      createdByName: formatCustomerName(actor, null),
    });

    return Response.json(row, { status: 201 });
  } catch (error: unknown) {
    return handleApiError(error);
  }
}
