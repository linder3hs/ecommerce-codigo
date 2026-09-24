import "server-only";

import {
  and,
  asc,
  count,
  desc,
  eq,
  gt,
  gte,
  ilike,
  inArray,
  isNotNull,
  isNull,
  lte,
  ne,
  or,
  sql,
  type SQL,
} from "drizzle-orm";
import type { PgColumn } from "drizzle-orm/pg-core";

import { isUniqueViolation, SlugConflictError } from "@/lib/api-error";
import { getDb, type Tx } from "@/server/db";
import { categories } from "@/server/db/schema/category";
import { products } from "@/server/db/schema/product";

import type { InferInsertModel, InferSelectModel } from "drizzle-orm";

type ProductRow = InferSelectModel<typeof products>;
type ProductInsert = InferInsertModel<typeof products>;

export type ProductCategoryRow = {
  id: string;
  name: string;
  slug: string;
};

export type ProductListRow = ProductRow & {
  category: ProductCategoryRow;
};

export type ProductSortField =
  | "name"
  | "priceCents"
  | "stock"
  | "createdAt"
  | "updatedAt";

export type ListProductsParams = {
  page: number;
  pageSize: number;
  search?: string;
  isActive?: boolean;
  categoryId?: string;
  maxStock?: number;
  sortBy: ProductSortField;
  sortDir: "asc" | "desc";
};

export type ListProductsResult = {
  rows: ProductListRow[];
  total: number;
};

// Proyección pública: el storefront no ve `sku`, `isActive`, `deletedAt`,
// `createdAt`, `updatedAt` ni `categoryId`. Se deriva del schema con `Pick`
// para que agregar una columna interna no la filtre por descuido.
export type PublicProductRow = Pick<
  ProductRow,
  | "id"
  | "name"
  | "slug"
  | "description"
  | "priceCents"
  | "compareAtPriceCents"
  | "stock"
  | "imageUrl"
> & {
  category: ProductCategoryRow;
};

// Lo que el checkout necesita leer de un producto: la proyección pública más el
// costo, que se congela en `order_items.unit_cost_cents` al comprar. Va aparte y
// NO se agrega a `PublicProductRow`: esa proyección es la que viaja al
// storefront y el costo no sale nunca de la trastienda.
export type CheckoutProductRow = PublicProductRow &
  Pick<ProductRow, "costCents">;

// Se separan los campos que son columna de los que no: `discount` es una
// expresión calculada y no cabe en `PUBLIC_SORT_COLUMNS`.
export type PublicProductSortColumn = "name" | "priceCents" | "createdAt";

export type PublicProductSortField = PublicProductSortColumn | "discount";

export type ListPublicProductsParams = {
  page: number;
  pageSize: number;
  search?: string;
  categorySlug?: string;
  minPriceCents?: number;
  maxPriceCents?: number;
  inStock?: boolean;
  onlyOffers?: boolean;
  sortBy: PublicProductSortField;
  sortDir: "asc" | "desc";
};

export type ListPublicProductsResult = {
  rows: PublicProductRow[];
  total: number;
};

export type CreateProductData = Pick<
  ProductInsert,
  "name" | "slug" | "sku" | "priceCents" | "categoryId"
> &
  Partial<
    Pick<
      ProductInsert,
      | "description"
      | "compareAtPriceCents"
      | "costCents"
      | "stock"
      | "imageUrl"
      | "isActive"
    >
  >;

// El costo se puede fijar al crear, pero después solo se cambia por la vía
// auditada (`updateCost`): omitirlo del tipo del `update` genérico hace que el
// corte lo sostenga el compilador y no solo el `omit` del schema Zod.
export type UpdateProductData = Partial<Omit<CreateProductData, "costCents">>;

// Resultado discriminado en vez de `null`: el handler necesita distinguir "no
// existe" (404) de "el delta dejaría el stock en negativo" (400), y en el
// segundo caso informar el stock actual.
export type AdjustStockResult =
  | { kind: "ok"; product: ProductRow }
  | { kind: "not_found" }
  | { kind: "insufficient"; current: number };

// Mismo patrón que `AdjustStockResult`: el handler necesita distinguir "no
// existe" (404) de "el costo ya era ese" (400 sin auditoría, porque no hubo
// cambio que registrar). `before`/`after` son la fila completa para que la
// respuesta y el log salgan de lo que de verdad se escribió.
export type UpdateCostResult =
  | { kind: "ok"; before: ProductRow; after: ProductRow }
  | { kind: "not_found" }
  | { kind: "unchanged" };

const SORT_COLUMNS: Record<ProductSortField, PgColumn> = {
  name: products.name,
  priceCents: products.priceCents,
  stock: products.stock,
  createdAt: products.createdAt,
  updatedAt: products.updatedAt,
};

const PUBLIC_SORT_COLUMNS: Record<PublicProductSortColumn, PgColumn> = {
  name: products.name,
  priceCents: products.priceCents,
  createdAt: products.createdAt,
};

// Fracción de descuento. El casteo a `numeric` es obligatorio: dos integers se
// dividen como integers en Postgres y todo daría 0. `NULLIF` protege de una
// división por cero y deja en NULL a los productos sin precio de comparación,
// que con `NULLS LAST` caen al final en ambas direcciones.
const DISCOUNT_EXPRESSION = sql`1 - ${products.priceCents}::numeric / NULLIF(${products.compareAtPriceCents}, 0)`;

function publicOrderBy(params: {
  sortBy: PublicProductSortField;
  sortDir: "asc" | "desc";
}): SQL {
  if (params.sortBy === "discount") {
    return params.sortDir === "asc"
      ? sql`${DISCOUNT_EXPRESSION} asc nulls last`
      : sql`${DISCOUNT_EXPRESSION} desc nulls last`;
  }

  const column = PUBLIC_SORT_COLUMNS[params.sortBy];

  return params.sortDir === "asc" ? asc(column) : desc(column);
}

export const SLUG_TAKEN_MESSAGE = "Ya existe un producto con ese slug.";
export const SKU_TAKEN_MESSAGE = "Ya existe un producto con ese SKU.";

function alive(): SQL {
  return isNull(products.deletedAt);
}

function buildFilters(params: {
  search?: string;
  isActive?: boolean;
  categoryId?: string;
  maxStock?: number;
}): SQL | undefined {
  const conditions: SQL[] = [alive()];

  if (params.search) {
    const pattern = `%${params.search}%`;
    const match = or(
      ilike(products.name, pattern),
      ilike(products.sku, pattern),
      ilike(products.slug, pattern),
    );

    if (match) {
      conditions.push(match);
    }
  }

  if (params.isActive !== undefined) {
    conditions.push(eq(products.isActive, params.isActive));
  }

  if (params.categoryId) {
    conditions.push(eq(products.categoryId, params.categoryId));
  }

  // Contra `undefined` y no contra un valor falsy, igual que `minPriceCents` en
  // `buildPublicFilters`: `maxStock: 0` —solo agotados— es un filtro válido.
  if (params.maxStock !== undefined) {
    conditions.push(lte(products.stock, params.maxStock));
  }

  return and(...conditions);
}

// Los dos índices únicos parciales son indistinguibles desde el 23505 que
// devuelve el driver, así que las altas comprueban slug y sku antes. Este mapeo
// solo cubre la carrera entre dos escrituras simultáneas y, al no poder saber
// cuál de los dos índices se violó, reporta el caso más frecuente: el slug.
async function mapUniqueConflict<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error: unknown) {
    if (isUniqueViolation(error)) {
      throw new SlugConflictError(SLUG_TAKEN_MESSAGE);
    }

    throw error;
  }
}

// Un producto es público solo si él y su categoría están vivos y publicados:
// sin la condición sobre `categories`, despublicar una categoría dejaría sus
// productos visibles en el storefront.
function buildPublicFilters(params: {
  search?: string;
  categorySlug?: string;
  minPriceCents?: number;
  maxPriceCents?: number;
  inStock?: boolean;
  onlyOffers?: boolean;
}): SQL | undefined {
  const conditions: SQL[] = [
    alive(),
    eq(products.isActive, true),
    isNull(categories.deletedAt),
    eq(categories.isActive, true),
  ];

  if (params.search) {
    const pattern = `%${params.search}%`;
    const match = or(
      ilike(products.name, pattern),
      ilike(products.slug, pattern),
      ilike(categories.name, pattern),
    );

    if (match) {
      conditions.push(match);
    }
  }

  if (params.categorySlug) {
    conditions.push(eq(categories.slug, params.categorySlug));
  }

  // Comparaciones contra `undefined` y no contra un valor falsy: un mínimo de
  // 0 centavos es un filtro válido y `if (params.minPriceCents)` lo perdería.
  if (params.minPriceCents !== undefined) {
    conditions.push(gte(products.priceCents, params.minPriceCents));
  }

  if (params.maxPriceCents !== undefined) {
    conditions.push(lte(products.priceCents, params.maxPriceCents));
  }

  if (params.inStock) {
    conditions.push(gt(products.stock, 0));
  }

  // Oferta = hay precio de comparación y es mayor que el vigente. Comparar en
  // SQL evita traer filas con un "descuento" de 0 % o negativo.
  if (params.onlyOffers) {
    conditions.push(isNotNull(products.compareAtPriceCents));
    conditions.push(gt(products.compareAtPriceCents, products.priceCents));
  }

  return and(...conditions);
}

export const productRepository = {
  async list(params: ListProductsParams): Promise<ListProductsResult> {
    const db = getDb();
    const where = buildFilters(params);
    const direction = params.sortDir === "asc" ? asc : desc;

    // Un solo innerJoin resuelve la categoría de todas las filas: sin esto
    // el listado dispararía una consulta por producto (N+1).
    const [rows, totalRows] = await Promise.all([
      db
        .select({
          product: products,
          category: {
            id: categories.id,
            name: categories.name,
            slug: categories.slug,
          },
        })
        .from(products)
        .innerJoin(categories, eq(products.categoryId, categories.id))
        .where(where)
        // `id` desempata: ninguna columna ordenable es única (hay muchos stocks
        // en 0 y muchos precios repetidos) y sin un criterio estable el `OFFSET`
        // repetiría o se saltaría filas al pasar de página.
        .orderBy(direction(SORT_COLUMNS[params.sortBy]), asc(products.id))
        .limit(params.pageSize)
        .offset((params.page - 1) * params.pageSize),
      db.select({ value: count() }).from(products).where(where),
    ]);

    return {
      rows: rows.map((row) => ({ ...row.product, category: row.category })),
      total: totalRows[0]?.value ?? 0,
    };
  },

  async listPublic(
    params: ListPublicProductsParams,
  ): Promise<ListPublicProductsResult> {
    const db = getDb();
    const where = buildPublicFilters(params);
    const orderBy = publicOrderBy(params);

    // Mismo `innerJoin` que `list()`: una consulta resuelve la categoría de
    // todas las filas en vez de una por producto (N+1).
    const [rows, totalRows] = await Promise.all([
      db
        .select({
          id: products.id,
          name: products.name,
          slug: products.slug,
          description: products.description,
          priceCents: products.priceCents,
          compareAtPriceCents: products.compareAtPriceCents,
          stock: products.stock,
          imageUrl: products.imageUrl,
          category: {
            id: categories.id,
            name: categories.name,
            slug: categories.slug,
          },
        })
        .from(products)
        .innerJoin(categories, eq(products.categoryId, categories.id))
        .where(where)
        .orderBy(orderBy)
        .limit(params.pageSize)
        .offset((params.page - 1) * params.pageSize),
      db
        .select({ value: count() })
        .from(products)
        .innerJoin(categories, eq(products.categoryId, categories.id))
        .where(where),
    ]);

    return { rows, total: totalRows[0]?.value ?? 0 };
  },

  async findPublicBySlug(slug: string): Promise<PublicProductRow | null> {
    const db = getDb();

    // Misma proyección y mismo `buildPublicFilters` que `listPublic`: la ficha
    // no puede ser una segunda definición de "producto público" o quedaría
    // accesible por URL después de despublicar su categoría.
    const [row] = await db
      .select({
        id: products.id,
        name: products.name,
        slug: products.slug,
        description: products.description,
        priceCents: products.priceCents,
        compareAtPriceCents: products.compareAtPriceCents,
        stock: products.stock,
        imageUrl: products.imageUrl,
        category: {
          id: categories.id,
          name: categories.name,
          slug: categories.slug,
        },
      })
      .from(products)
      .innerJoin(categories, eq(products.categoryId, categories.id))
      .where(and(buildPublicFilters({}), eq(products.slug, slug)))
      .limit(1);

    return row ?? null;
  },

  /**
   * Resuelve varias líneas de carrito en una sola consulta, con el mismo
   * criterio de "producto público" que el catálogo: un producto despublicado
   * —o cuya categoría lo esté— no aparece y el checkout lo trata como
   * inexistente. Devuelve solo las filas encontradas: quien llama compara
   * contra los ids pedidos para saber cuáles faltan.
   *
   * Trae `costCents` además de la proyección pública porque cada línea de la
   * orden congela el costo vigente en el instante de la compra. Quien llama es
   * el checkout, en servidor: esta fila no se serializa hacia el navegador.
   */
  async findManyActiveByIds(ids: string[]): Promise<CheckoutProductRow[]> {
    if (ids.length === 0) {
      return [];
    }

    const db = getDb();

    return db
      .select({
        id: products.id,
        name: products.name,
        slug: products.slug,
        description: products.description,
        priceCents: products.priceCents,
        compareAtPriceCents: products.compareAtPriceCents,
        stock: products.stock,
        imageUrl: products.imageUrl,
        costCents: products.costCents,
        category: {
          id: categories.id,
          name: categories.name,
          slug: categories.slug,
        },
      })
      .from(products)
      .innerJoin(categories, eq(products.categoryId, categories.id))
      .where(and(buildPublicFilters({}), inArray(products.id, ids)));
  },

  async findById(id: string): Promise<ProductRow | null> {
    const db = getDb();

    const [row] = await db
      .select()
      .from(products)
      .where(and(eq(products.id, id), alive()))
      .limit(1);

    return row ?? null;
  },

  async existsBySlug(slug: string, excludeId?: string): Promise<boolean> {
    const db = getDb();

    const [row] = await db
      .select({ id: products.id })
      .from(products)
      .where(
        and(
          eq(products.slug, slug),
          alive(),
          excludeId ? ne(products.id, excludeId) : undefined,
        ),
      )
      .limit(1);

    return row !== undefined;
  },

  async existsBySku(sku: string, excludeId?: string): Promise<boolean> {
    const db = getDb();

    const [row] = await db
      .select({ id: products.id })
      .from(products)
      .where(
        and(
          eq(products.sku, sku),
          alive(),
          excludeId ? ne(products.id, excludeId) : undefined,
        ),
      )
      .limit(1);

    return row !== undefined;
  },

  async create(data: CreateProductData): Promise<ProductRow> {
    const db = getDb();

    return mapUniqueConflict(async () => {
      const [row] = await db.insert(products).values(data).returning();

      return row;
    });
  },

  async update(id: string, data: UpdateProductData): Promise<ProductRow | null> {
    const db = getDb();

    return mapUniqueConflict(async () => {
      const [row] = await db
        .update(products)
        .set(data)
        .where(and(eq(products.id, id), alive()))
        .returning();

      return row ?? null;
    });
  },

  /**
   * Suma `delta` al stock vigente. La guarda `stock >= -delta` vive en el WHERE
   * y no en JavaScript: dos ajustes concurrentes leerían el mismo valor y un
   * delta negativo podría hacer fallar el `check` de la base. Si no se escribió
   * nada, la relectura en la misma `tx` dice por qué.
   *
   * El `tx` es obligatorio: quien llama abre la transacción para que el
   * `audit_logs` de este ajuste viva o revierta con él.
   */
  async adjustStock(
    id: string,
    delta: number,
    tx: Tx,
  ): Promise<AdjustStockResult> {
    const [row] = await tx
      .update(products)
      .set({ stock: sql`${products.stock} + ${delta}` })
      .where(and(eq(products.id, id), alive(), gte(products.stock, -delta)))
      .returning();

    if (row) {
      return { kind: "ok", product: row };
    }

    // `alive()` también aquí: un producto borrado no es un stock insuficiente.
    const [current] = await tx
      .select({ stock: products.stock })
      .from(products)
      .where(and(eq(products.id, id), alive()))
      .limit(1);

    if (!current) {
      return { kind: "not_found" };
    }

    return { kind: "insufficient", current: current.stock };
  },

  /**
   * Fija el costo del producto (o lo devuelve a `null`, costo desconocido)
   * dentro de la transacción de quien llama, que es la misma donde se escribe el
   * `audit_logs` de este cambio.
   *
   * El `SELECT ... FOR UPDATE` no es decorativo: el log guarda el costo anterior
   * y, sin bloquear la fila, dos ediciones concurrentes leerían el mismo
   * `before` y una de las dos registraría un valor previo que nunca existió. El
   * lock se libera al cerrar la transacción.
   */
  async updateCost(
    id: string,
    costCents: number | null,
    tx: Tx,
  ): Promise<UpdateCostResult> {
    const [before] = await tx
      .select()
      .from(products)
      .where(and(eq(products.id, id), alive()))
      .limit(1)
      .for("update");

    if (!before) {
      return { kind: "not_found" };
    }

    // `null === null` incluido: reenviar "costo desconocido" sobre un producto
    // que ya lo estaba tampoco es un cambio que auditar.
    if (before.costCents === costCents) {
      return { kind: "unchanged" };
    }

    const [after] = await tx
      .update(products)
      .set({ costCents })
      .where(and(eq(products.id, id), alive()))
      .returning();

    return { kind: "ok", before, after };
  },

  async softDelete(id: string): Promise<boolean> {
    const db = getDb();

    const [row] = await db
      .update(products)
      .set({ deletedAt: new Date() })
      .where(and(eq(products.id, id), alive()))
      .returning({ id: products.id });

    return row !== undefined;
  },
};
