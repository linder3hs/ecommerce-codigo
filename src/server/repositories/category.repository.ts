import "server-only";

import {
  and,
  asc,
  count,
  desc,
  eq,
  ilike,
  isNull,
  ne,
  or,
  type SQL,
} from "drizzle-orm";
import type { PgColumn } from "drizzle-orm/pg-core";

import { isUniqueViolation, SlugConflictError } from "@/lib/api-error";
import { getDb } from "@/server/db";
import { categories } from "@/server/db/schema/category";

import type { InferInsertModel, InferSelectModel } from "drizzle-orm";

type CategoryRow = InferSelectModel<typeof categories>;
type CategoryInsert = InferInsertModel<typeof categories>;

export type CategorySortField = "name" | "createdAt" | "updatedAt";

export type ListCategoriesParams = {
  page: number;
  pageSize: number;
  search?: string;
  isActive?: boolean;
  sortBy: CategorySortField;
  sortDir: "asc" | "desc";
};

export type ListCategoriesResult = {
  rows: CategoryRow[];
  total: number;
};

// Proyección pública: el storefront no ve `description`, `isActive`,
// `deletedAt` ni los timestamps. Derivada del schema con `Pick` para que una
// columna interna nueva no se filtre por descuido.
export type PublicCategoryRow = Pick<
  CategoryRow,
  "id" | "name" | "slug" | "imageUrl"
>;

export type CreateCategoryData = Pick<CategoryInsert, "name" | "slug"> &
  Partial<Pick<CategoryInsert, "description" | "imageUrl" | "isActive">>;

export type UpdateCategoryData = Partial<CreateCategoryData>;

const SORT_COLUMNS: Record<CategorySortField, PgColumn> = {
  name: categories.name,
  createdAt: categories.createdAt,
  updatedAt: categories.updatedAt,
};

export const SLUG_TAKEN_MESSAGE = "Ya existe una categoría con ese slug.";

function alive(): SQL {
  return isNull(categories.deletedAt);
}

function buildFilters(params: {
  search?: string;
  isActive?: boolean;
}): SQL | undefined {
  const conditions: SQL[] = [alive()];

  if (params.search) {
    const pattern = `%${params.search}%`;
    const match = or(
      ilike(categories.name, pattern),
      ilike(categories.slug, pattern),
    );

    if (match) {
      conditions.push(match);
    }
  }

  if (params.isActive !== undefined) {
    conditions.push(eq(categories.isActive, params.isActive));
  }

  return and(...conditions);
}

async function mapSlugConflict<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error: unknown) {
    if (isUniqueViolation(error)) {
      throw new SlugConflictError(SLUG_TAKEN_MESSAGE);
    }

    throw error;
  }
}

export const categoryRepository = {
  async list(params: ListCategoriesParams): Promise<ListCategoriesResult> {
    const db = getDb();
    const where = buildFilters(params);
    const direction = params.sortDir === "asc" ? asc : desc;

    const [rows, totalRows] = await Promise.all([
      db
        .select()
        .from(categories)
        .where(where)
        .orderBy(direction(SORT_COLUMNS[params.sortBy]))
        .limit(params.pageSize)
        .offset((params.page - 1) * params.pageSize),
      db.select({ value: count() }).from(categories).where(where),
    ]);

    return { rows, total: totalRows[0]?.value ?? 0 };
  },

  // Sin paginar: el menú de categorías del storefront las muestra todas y son
  // una decena, no un listado que crezca sin techo.
  async listPublic(): Promise<PublicCategoryRow[]> {
    const db = getDb();

    return db
      .select({
        id: categories.id,
        name: categories.name,
        slug: categories.slug,
        imageUrl: categories.imageUrl,
      })
      .from(categories)
      .where(and(alive(), eq(categories.isActive, true)))
      .orderBy(asc(categories.name));
  },

  async findById(id: string): Promise<CategoryRow | null> {
    const db = getDb();

    const [row] = await db
      .select()
      .from(categories)
      .where(and(eq(categories.id, id), alive()))
      .limit(1);

    return row ?? null;
  },

  async existsBySlug(slug: string, excludeId?: string): Promise<boolean> {
    const db = getDb();

    const [row] = await db
      .select({ id: categories.id })
      .from(categories)
      .where(
        and(
          eq(categories.slug, slug),
          alive(),
          excludeId ? ne(categories.id, excludeId) : undefined,
        ),
      )
      .limit(1);

    return row !== undefined;
  },

  async create(data: CreateCategoryData): Promise<CategoryRow> {
    const db = getDb();

    return mapSlugConflict(async () => {
      const [row] = await db.insert(categories).values(data).returning();

      return row;
    });
  },

  async update(
    id: string,
    data: UpdateCategoryData,
  ): Promise<CategoryRow | null> {
    const db = getDb();

    return mapSlugConflict(async () => {
      const [row] = await db
        .update(categories)
        .set(data)
        .where(and(eq(categories.id, id), alive()))
        .returning();

      return row ?? null;
    });
  },

  async softDelete(id: string): Promise<boolean> {
    const db = getDb();

    const [row] = await db
      .update(categories)
      .set({ deletedAt: new Date() })
      .where(and(eq(categories.id, id), alive()))
      .returning({ id: categories.id });

    return row !== undefined;
  },
};
