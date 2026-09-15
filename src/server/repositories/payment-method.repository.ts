import "server-only";

import { and, desc, eq, ne } from "drizzle-orm";

import { getDb, type Db, type Tx } from "@/server/db";
import { paymentMethods } from "@/server/db/schema/payment-method";

import type { InferInsertModel, InferSelectModel } from "drizzle-orm";

export type PaymentMethodRow = InferSelectModel<typeof paymentMethods>;

type PaymentMethodInsert = InferInsertModel<typeof paymentMethods>;

export type UpsertPaymentMethodData = Pick<
  PaymentMethodInsert,
  | "userId"
  | "stripePaymentMethodId"
  | "brand"
  | "last4"
  | "expMonth"
  | "expYear"
>;

/**
 * `created` distingue el alta real del reenvío del mismo evento de Stripe: solo
 * la primera vez hay algo que auditar.
 */
export type UpsertPaymentMethodResult = {
  row: PaymentMethodRow;
  created: boolean;
};

async function findFirstByUser(
  db: Db | Tx,
  userId: string,
): Promise<PaymentMethodRow | null> {
  const [row] = await db
    .select()
    .from(paymentMethods)
    .where(eq(paymentMethods.userId, userId))
    .orderBy(desc(paymentMethods.createdAt))
    .limit(1);

  return row ?? null;
}

export const paymentMethodRepository = {
  /** Las más recientes primero; la predeterminada la marca la propia fila. */
  async findManyByUser(
    userId: string,
    db: Db | Tx = getDb(),
  ): Promise<PaymentMethodRow[]> {
    return db
      .select()
      .from(paymentMethods)
      .where(eq(paymentMethods.userId, userId))
      .orderBy(desc(paymentMethods.createdAt));
  },

  /**
   * Tarjeta por id restringida a su dueño. El `user_id` va en el WHERE, así que
   * "no existe" y "no es tuya" son el mismo `null` y quien llama no puede
   * distinguirlos por accidente.
   */
  async findByIdForUser(
    id: string,
    userId: string,
    db: Db | Tx = getDb(),
  ): Promise<PaymentMethodRow | null> {
    const [row] = await db
      .select()
      .from(paymentMethods)
      .where(and(eq(paymentMethods.id, id), eq(paymentMethods.userId, userId)))
      .limit(1);

    return row ?? null;
  },

  /**
   * Alta desde el webhook. Idempotente por `stripe_payment_method_id`: Stripe
   * entrega at-least-once y el mismo `checkout.session.completed` puede llegar
   * dos veces, así que el reenvío actualiza la fila en vez de duplicarla.
   *
   * La primera tarjeta del usuario queda predeterminada sola: un comprador con
   * una sola tarjeta no debería tener que elegirla.
   */
  async upsertFromStripe(
    data: UpsertPaymentMethodData,
    tx: Db | Tx,
  ): Promise<UpsertPaymentMethodResult> {
    // Una sola consulta responde las dos preguntas: si es la primera tarjeta
    // del usuario y si este `pm_…` ya estaba guardado.
    const owned = await this.findManyByUser(data.userId, tx);
    const existing = owned.some(
      (row) => row.stripePaymentMethodId === data.stripePaymentMethodId,
    );

    const [row] = await tx
      .insert(paymentMethods)
      .values({ ...data, isDefault: owned.length === 0 })
      .onConflictDoUpdate({
        target: paymentMethods.stripePaymentMethodId,
        set: {
          brand: data.brand,
          last4: data.last4,
          expMonth: data.expMonth,
          expYear: data.expYear,
          updatedAt: new Date(),
        },
      })
      .returning();

    return { row, created: !existing };
  },

  /**
   * Marca la tarjeta como predeterminada y limpia la anterior. Las dos
   * sentencias van en la misma transacción porque el índice único parcial
   * `payment_methods_user_default_unq` no admite un instante con dos filas
   * marcadas. Devuelve `null` si la tarjeta no es del usuario.
   */
  async setDefault(
    id: string,
    userId: string,
    db?: Db | Tx,
  ): Promise<PaymentMethodRow | null> {
    const run = async (tx: Db | Tx): Promise<PaymentMethodRow | null> => {
      await tx
        .update(paymentMethods)
        .set({ isDefault: false })
        .where(
          and(
            eq(paymentMethods.userId, userId),
            eq(paymentMethods.isDefault, true),
            ne(paymentMethods.id, id),
          ),
        );

      const [row] = await tx
        .update(paymentMethods)
        .set({ isDefault: true })
        .where(
          and(eq(paymentMethods.id, id), eq(paymentMethods.userId, userId)),
        )
        .returning();

      return row ?? null;
    };

    return db ? run(db) : getDb().transaction(run);
  },

  /**
   * Baja definitiva. Devuelve la fila borrada —el handler necesita su `pm_…`
   * para el `detach` y su marca para auditar— o `null` si no era del usuario.
   * Si la borrada era la predeterminada, la más reciente de las que quedan
   * ocupa su lugar: dejar al usuario sin default lo obligaría a reelegir.
   */
  async deleteForUser(
    id: string,
    userId: string,
    db?: Db | Tx,
  ): Promise<PaymentMethodRow | null> {
    const run = async (tx: Db | Tx): Promise<PaymentMethodRow | null> => {
      const [deleted] = await tx
        .delete(paymentMethods)
        .where(
          and(eq(paymentMethods.id, id), eq(paymentMethods.userId, userId)),
        )
        .returning();

      if (!deleted) {
        return null;
      }

      if (deleted.isDefault) {
        const next = await findFirstByUser(tx, userId);

        if (next) {
          await tx
            .update(paymentMethods)
            .set({ isDefault: true })
            .where(eq(paymentMethods.id, next.id));
        }
      }

      return deleted;
    };

    return db ? run(db) : getDb().transaction(run);
  },
};
