import "server-only";

import { and, asc, desc, eq, gte, inArray, lt, ne, sql } from "drizzle-orm";

import { getDb, type Db, type Tx } from "@/server/db";
import { orderItems, orders } from "@/server/db/schema/order";
import { products } from "@/server/db/schema/product";

import type { InferInsertModel, InferSelectModel } from "drizzle-orm";

export type OrderRow = InferSelectModel<typeof orders>;
export type OrderItemRow = InferSelectModel<typeof orderItems>;
export type OrderStatus = OrderRow["status"];

type OrderInsert = InferInsertModel<typeof orders>;
type OrderItemInsert = InferInsertModel<typeof orderItems>;

export type OrderWithItemsRow = OrderRow & {
  items: OrderItemRow[];
};

export type CreateOrderItemData = Pick<
  OrderItemInsert,
  "productId" | "nameSnapshot" | "unitPriceCents" | "qty"
>;

export type CreatePendingOrderData = Pick<
  OrderInsert,
  "userId" | "currency" | "stripeCheckoutSessionId"
> & {
  // El id llega de fuera porque la sesión de Stripe se crea antes que la fila y
  // necesita el `metadata.orderId` ya resuelto.
  id: string;
  items: CreateOrderItemData[];
};

export type CreatePendingIntentOrderData = Omit<
  CreatePendingOrderData,
  "stripeCheckoutSessionId"
>;

/**
 * Línea que no pudo descontarse entera: entre la creación de la sesión y el
 * cobro alguien más compró las últimas unidades. No aborta el fulfillment —el
 * dinero ya está cobrado— pero queda registrada para que el webhook la audite.
 */
export type StockShortage = {
  productId: string;
  requested: number;
  available: number;
};

/** Intervalo semiabierto `[fromInstant, toInstant)` ya resuelto a instantes. */
export type FindManyByUserInRangeParams = {
  userId: string;
  fromInstant: Date;
  toInstant: Date;
};

/**
 * Guarda de tamaño de la respuesta del historial, no paginación: el rango es lo
 * que acota la consulta. Sin este tope, un rango de un año de una cuenta muy
 * activa devolvería una respuesta sin límite superior conocido.
 */
const HISTORY_LIMIT = 200;

function totalCents(items: CreateOrderItemData[]): number {
  // Aritmética entera de punta a punta: los importes son centavos.
  return items.reduce(
    (total, item) => total + item.unitPriceCents * item.qty,
    0,
  );
}

async function loadItems(
  db: Db | Tx,
  orderId: string,
): Promise<OrderItemRow[]> {
  return db
    .select()
    .from(orderItems)
    .where(eq(orderItems.orderId, orderId))
    .orderBy(asc(orderItems.nameSnapshot));
}

export const orderRepository = {
  /**
   * Orden en `pending` con sus líneas, en una sola transacción: una orden sin
   * ítems no describe ninguna compra y no debe poder existir.
   */
  async createPending(
    data: CreatePendingOrderData,
    db?: Db | Tx,
  ): Promise<OrderWithItemsRow> {
    const run = async (tx: Db | Tx): Promise<OrderWithItemsRow> => {
      const [order] = await tx
        .insert(orders)
        .values({
          id: data.id,
          userId: data.userId,
          currency: data.currency,
          stripeCheckoutSessionId: data.stripeCheckoutSessionId,
          totalCents: totalCents(data.items),
        })
        .returning();

      const items = await tx
        .insert(orderItems)
        .values(data.items.map((item) => ({ ...item, orderId: order.id })))
        .returning();

      return { ...order, items };
    };

    return db ? run(db) : getDb().transaction(run);
  },

  /**
   * Orden del pago con tarjeta guardada: nace sin sesión de Checkout porque ese
   * camino confirma un PaymentIntent en el servidor y no abre ninguna. El
   * `stripe_payment_intent_id` tampoco se conoce todavía —el PaymentIntent se
   * crea después, con este id ya en su `metadata`— y lo escribe el webhook.
   */
  async createPendingForPaymentIntent(
    data: CreatePendingIntentOrderData,
    db?: Db | Tx,
  ): Promise<OrderWithItemsRow> {
    return this.createPending(
      { ...data, stripeCheckoutSessionId: null },
      db,
    );
  },

  async findBySessionId(
    stripeCheckoutSessionId: string,
    db: Db | Tx = getDb(),
  ): Promise<OrderWithItemsRow | null> {
    const [order] = await db
      .select()
      .from(orders)
      .where(eq(orders.stripeCheckoutSessionId, stripeCheckoutSessionId))
      .limit(1);

    if (!order) {
      return null;
    }

    return { ...order, items: await loadItems(db, order.id) };
  },

  /**
   * Historial de compras del usuario dentro del rango. El filtro por `user_id`
   * va en el WHERE y no en JavaScript: es lo que impide que una orden ajena
   * llegue a salir de la base.
   *
   * Las `pending` quedan fuera: son sesiones de Checkout que nunca se pagaron y
   * no describen una compra.
   *
   * Los ítems se traen en una sola consulta con `inArray` y se reparten en
   * memoria; un `loadItems` por orden serían 200 idas a Neon por request.
   */
  async findManyByUserInRange(
    { userId, fromInstant, toInstant }: FindManyByUserInRangeParams,
    db: Db | Tx = getDb(),
  ): Promise<OrderWithItemsRow[]> {
    const rows = await db
      .select()
      .from(orders)
      .where(
        and(
          eq(orders.userId, userId),
          // ne(orders.status, "pending"),
          gte(orders.createdAt, fromInstant),
          lt(orders.createdAt, toInstant),
        ),
      )
      .orderBy(desc(orders.createdAt))
      .limit(HISTORY_LIMIT);

    if (rows.length === 0) {
      return [];
    }

    const items = await db
      .select()
      .from(orderItems)
      .where(
        inArray(
          orderItems.orderId,
          rows.map((row) => row.id),
        ),
      )
      .orderBy(asc(orderItems.nameSnapshot));

    const byOrder = new Map<string, OrderItemRow[]>();

    for (const item of items) {
      const bucket = byOrder.get(item.orderId);

      if (bucket) {
        bucket.push(item);

        continue;
      }

      byOrder.set(item.orderId, [item]);
    }

    return rows.map((row) => ({ ...row, items: byOrder.get(row.id) ?? [] }));
  },

  /**
   * Orden por id restringida a su dueño. El `user_id` es parte del WHERE, así
   * que "no existe" y "no es tuya" son el mismo `null` y quien llama no puede
   * distinguirlos por accidente.
   */
  async findByIdForUser(
    orderId: string,
    userId: string,
    db: Db | Tx = getDb(),
  ): Promise<OrderRow | null> {
    const [order] = await db
      .select()
      .from(orders)
      .where(and(eq(orders.id, orderId), eq(orders.userId, userId)))
      .limit(1);

    return order ?? null;
  },

  /**
   * Igual que `findByIdForUser` pero con las líneas. Va aparte porque quien
   * solo necesita el estado —la boleta, por ejemplo— no debería pagar una
   * segunda consulta por unos ítems que no va a mirar.
   */
  async findByIdForUserWithItems(
    orderId: string,
    userId: string,
    db: Db | Tx = getDb(),
  ): Promise<OrderWithItemsRow | null> {
    const order = await this.findByIdForUser(orderId, userId, db);

    if (!order) {
      return null;
    }

    return { ...order, items: await loadItems(db, order.id) };
  },

  /**
   * Idempotente por la guarda `status <> 'paid'`: Stripe entrega at-least-once
   * y el mismo evento puede llegar dos veces. Devuelve `null` cuando la orden ya
   * estaba pagada, que es la señal para no volver a descontar stock.
   */
  async markPaid(
    stripeCheckoutSessionId: string,
    stripePaymentIntentId: string | null,
    tx: Db | Tx,
  ): Promise<OrderRow | null> {
    const [row] = await tx
      .update(orders)
      .set({ status: "paid", stripePaymentIntentId })
      .where(
        and(
          eq(orders.stripeCheckoutSessionId, stripeCheckoutSessionId),
          ne(orders.status, "paid"),
        ),
      )
      .returning();

    return row ?? null;
  },

  /**
   * Gemela de `markPaid` para el camino del PaymentIntent. Localiza la orden
   * por su id —que viajó en `metadata.orderId`— y no por el
   * `stripe_payment_intent_id`, porque el webhook puede adelantarse a que la
   * columna esté escrita. La guarda `status <> 'paid'` es la misma: un evento
   * reenviado devuelve `null` y no vuelve a descontar stock.
   */
  async markPaidByPaymentIntent(
    orderId: string,
    stripePaymentIntentId: string,
    tx: Db | Tx,
  ): Promise<OrderRow | null> {
    const [row] = await tx
      .update(orders)
      .set({ status: "paid", stripePaymentIntentId })
      .where(and(eq(orders.id, orderId), ne(orders.status, "paid")))
      .returning();

    return row ?? null;
  },

  // Solo desde `pending`: un pago ya confirmado no se degrada por un evento
  // fuera de orden. El handler y el webhook la llaman por separado y la guarda
  // hace que la segunda vez no cambie nada.
  async markPaymentFailedByPaymentIntent(
    orderId: string,
    stripePaymentIntentId: string | null,
    db: Db | Tx = getDb(),
  ): Promise<OrderRow | null> {
    const [row] = await db
      .update(orders)
      // Sin id de PaymentIntent no se toca la columna: escribir `null` encima
      // borraría el que ya hubiera guardado un evento anterior.
      .set(
        stripePaymentIntentId
          ? { status: "payment_failed", stripePaymentIntentId }
          : { status: "payment_failed" },
      )
      .where(and(eq(orders.id, orderId), eq(orders.status, "pending")))
      .returning();

    return row ?? null;
  },

  // Solo desde `pending`: un pago ya confirmado no se degrada por un evento
  // fuera de orden.
  async markPaymentFailed(
    stripeCheckoutSessionId: string,
    db: Db | Tx = getDb(),
  ): Promise<OrderRow | null> {
    const [row] = await db
      .update(orders)
      .set({ status: "payment_failed" })
      .where(
        and(
          eq(orders.stripeCheckoutSessionId, stripeCheckoutSessionId),
          eq(orders.status, "pending"),
        ),
      )
      .returning();

    return row ?? null;
  },

  /**
   * Descuenta el stock de una orden dentro de la transacción del fulfillment.
   * La guarda `stock >= qty` vive en el WHERE y no en JavaScript: dos webhooks
   * concurrentes leerían el mismo valor y dejarían la columna en negativo.
   * Lo que no alcanza se lleva a 0 y se devuelve como faltante.
   */
  async decrementStock(orderId: string, tx: Tx): Promise<StockShortage[]> {
    const items = await loadItems(tx, orderId);
    const shortages: StockShortage[] = [];

    for (const item of items) {
      const [decremented] = await tx
        .update(products)
        .set({ stock: sql`${products.stock} - ${item.qty}` })
        .where(
          and(eq(products.id, item.productId), gte(products.stock, item.qty)),
        )
        .returning({ id: products.id });

      if (decremented) {
        continue;
      }

      const [current] = await tx
        .select({ stock: products.stock })
        .from(products)
        .where(eq(products.id, item.productId))
        .limit(1);

      const available = current?.stock ?? 0;

      if (available > 0) {
        await tx
          .update(products)
          .set({ stock: 0 })
          .where(eq(products.id, item.productId));
      }

      shortages.push({
        productId: item.productId,
        requested: item.qty,
        available,
      });
    }

    return shortages;
  },
};
