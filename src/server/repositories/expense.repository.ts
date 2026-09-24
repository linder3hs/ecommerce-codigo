import "server-only";

import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  isNull,
  lte,
  sum,
  type SQL,
} from "drizzle-orm";

import { formatCustomerName } from "@/lib/format";
import { getDb, type Tx } from "@/server/db";
import { expenses } from "@/server/db/schema/expense";
import { users } from "@/server/db/schema/user";

import type { InferInsertModel, InferSelectModel } from "drizzle-orm";

export type ExpenseDbRow = InferSelectModel<typeof expenses>;
type ExpenseInsert = InferInsertModel<typeof expenses>;

export type ListExpensesParams = {
  page: number;
  pageSize: number;
  category?: ExpenseDbRow["category"];
  // Días de calendario "YYYY-MM-DD", ambos extremos incluidos. `expense_date`
  // es `date`, así que se comparan tal cual: no hay zona horaria que convertir.
  dateFrom?: string;
  dateTo?: string;
};

// Fila del listado con el autor ya resuelto por el join. Sin `createdBy`,
// `deletedAt` ni `updatedAt`: lo que sale de aquí es lo que el panel muestra.
export type ExpenseListRow = Pick<
  ExpenseDbRow,
  | "id"
  | "category"
  | "amountCents"
  | "expenseDate"
  | "description"
  | "createdAt"
> & {
  createdByName: string | null;
};

export type ListExpensesResult = {
  rows: ExpenseListRow[];
  total: number;
};

export type CreateExpenseData = Pick<
  ExpenseInsert,
  "category" | "amountCents" | "expenseDate" | "description" | "createdBy"
>;

// `createdBy` no se edita: el autor de un egreso es un hecho, no un campo.
export type UpdateExpenseData = Partial<
  Pick<
    ExpenseInsert,
    "category" | "amountCents" | "expenseDate" | "description"
  >
>;

// Resultado discriminado, igual que `UpdateCostResult`: el handler decide el
// 404 fuera de la transacción y audita con lo que de verdad se escribió.
export type ExpenseMutationResult =
  | { kind: "ok"; before: ExpenseDbRow; after: ExpenseDbRow }
  | { kind: "not_found" };

export type ExpenseTotalsRow = { expensesCents: number };

export type ExpenseDayRow = {
  /** `expense_date` tal cual: ya es el día civil de la tienda, `YYYY-MM-DD`. */
  day: string;
  expensesCents: number;
};

// Exportada: Ganancias (020) suma egresos con el mismo criterio de "vivo".
export function alive(): SQL {
  return isNull(expenses.deletedAt);
}

function buildFilters(params: {
  category?: ExpenseDbRow["category"];
  dateFrom?: string;
  dateTo?: string;
}): SQL | undefined {
  const conditions: SQL[] = [alive()];

  if (params.category) {
    conditions.push(eq(expenses.category, params.category));
  }

  if (params.dateFrom) {
    conditions.push(gte(expenses.expenseDate, params.dateFrom));
  }

  if (params.dateTo) {
    conditions.push(lte(expenses.expenseDate, params.dateTo));
  }

  return and(...conditions);
}

const LIST_COLUMNS = {
  id: expenses.id,
  category: expenses.category,
  amountCents: expenses.amountCents,
  expenseDate: expenses.expenseDate,
  description: expenses.description,
  createdAt: expenses.createdAt,
  firstName: users.firstName,
  lastName: users.lastName,
};

type ListColumnsRow = Omit<ExpenseListRow, "createdByName"> & {
  firstName: string | null;
  lastName: string | null;
};

function toListRow({ firstName, lastName, ...row }: ListColumnsRow) {
  return {
    ...row,
    createdByName: formatCustomerName({ firstName, lastName }, null),
  } satisfies ExpenseListRow;
}

/**
 * Lee la fila viva bajo `SELECT ... FOR UPDATE`. El lock no es decorativo: el
 * log guarda el `before` y, sin bloquear la fila, dos ediciones concurrentes
 * leerían el mismo estado previo y una registraría un valor que nunca existió.
 * Se libera al cerrar la transacción de quien llama.
 */
async function lockAlive(id: string, tx: Tx): Promise<ExpenseDbRow | null> {
  const [row] = await tx
    .select()
    .from(expenses)
    .where(and(eq(expenses.id, id), alive()))
    .limit(1)
    .for("update");

  return row ?? null;
}

export const expenseRepository = {
  // `innerJoin` y no `leftJoin`: `created_by` es notNull con RESTRICT, el autor
  // siempre existe. El conteo no lo necesita porque el filtro no toca `users`.
  async list(params: ListExpensesParams): Promise<ListExpensesResult> {
    const db = getDb();
    const where = buildFilters(params);

    const [rows, totalRows] = await Promise.all([
      db
        .select(LIST_COLUMNS)
        .from(expenses)
        .innerJoin(users, eq(users.id, expenses.createdBy))
        .where(where)
        .orderBy(desc(expenses.expenseDate), desc(expenses.createdAt))
        .limit(params.pageSize)
        .offset((params.page - 1) * params.pageSize),
      db.select({ value: count() }).from(expenses).where(where),
    ]);

    return { rows: rows.map(toListRow), total: totalRows[0]?.value ?? 0 };
  },

  async findById(id: string): Promise<ExpenseListRow | null> {
    const db = getDb();

    const [row] = await db
      .select(LIST_COLUMNS)
      .from(expenses)
      .innerJoin(users, eq(users.id, expenses.createdBy))
      .where(and(eq(expenses.id, id), alive()))
      .limit(1);

    return row ? toListRow(row) : null;
  },

  /**
   * Las tres mutaciones exigen `tx`: quien llama abre la transacción para que
   * el `audit_logs` de este cambio viva o revierta con él (regla dura #9).
   */
  async create(data: CreateExpenseData, tx: Tx): Promise<ExpenseDbRow> {
    const [row] = await tx.insert(expenses).values(data).returning();

    return row;
  },

  async update(
    id: string,
    data: UpdateExpenseData,
    tx: Tx,
  ): Promise<ExpenseMutationResult> {
    const before = await lockAlive(id, tx);

    if (!before) {
      return { kind: "not_found" };
    }

    const [after] = await tx
      .update(expenses)
      .set(data)
      .where(and(eq(expenses.id, id), alive()))
      .returning();

    return { kind: "ok", before, after };
  },

  async softDelete(id: string, tx: Tx): Promise<ExpenseMutationResult> {
    const before = await lockAlive(id, tx);

    if (!before) {
      return { kind: "not_found" };
    }

    const [after] = await tx
      .update(expenses)
      .set({ deletedAt: new Date() })
      .where(and(eq(expenses.id, id), alive()))
      .returning();

    return { kind: "ok", before, after };
  },

  /**
   * Egresos vivos de los días `[from, to]`, ambos incluidos. `expense_date` ya
   * es un día civil de la tienda: se compara el string tal cual, sin convertir
   * zona ni usar `revenueScope`. Los dos extremos se aplican siempre, sin el
   * `if` de `buildFilters`: en un total, un extremo omitido en silencio sumaría
   * egresos de fuera del rango.
   */
  async sumExpenseTotals(from: string, to: string): Promise<ExpenseTotalsRow> {
    const [row] = await getDb()
      .select({ expensesCents: sum(expenses.amountCents) })
      .from(expenses)
      .where(
        and(
          alive(),
          gte(expenses.expenseDate, from),
          lte(expenses.expenseDate, to),
        ),
      );

    return { expensesCents: Number(row?.expensesCents ?? 0) };
  },

  /** Lo mismo por día; solo devuelve días con egresos, el relleno es del lib. */
  async sumExpensesByDay(from: string, to: string): Promise<ExpenseDayRow[]> {
    const rows = await getDb()
      .select({
        day: expenses.expenseDate,
        expensesCents: sum(expenses.amountCents),
      })
      .from(expenses)
      .where(
        and(
          alive(),
          gte(expenses.expenseDate, from),
          lte(expenses.expenseDate, to),
        ),
      )
      .groupBy(expenses.expenseDate)
      .orderBy(asc(expenses.expenseDate));

    return rows.map((row) => ({
      day: row.day,
      expensesCents: Number(row.expensesCents ?? 0),
    }));
  },
};
