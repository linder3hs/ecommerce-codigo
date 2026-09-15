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
import { getDb } from "@/server/db";
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
      | "stock"
      | "imageUrl"
      | "isActive"
    >
  >;

export type UpdateProductData = Partial<CreateProductData>;

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
        .orderBy(direction(SORT_COLUMNS[params.sortBy]))
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
   */
  async findManyActiveByIds(ids: string[]): Promise<PublicProductRow[]> {
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
