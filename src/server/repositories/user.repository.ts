import "server-only";

import { and, count, desc, eq, ilike, isNull, or, type SQL } from "drizzle-orm";

import { getDb, type Db, type Tx } from "@/server/db";
import { roles } from "@/server/db/schema/role";
import { users } from "@/server/db/schema/user";
import { userRoles } from "@/server/db/schema/user-role";

import type { InferInsertModel, InferSelectModel } from "drizzle-orm";

export type UserRow = InferSelectModel<typeof users>;
type UserInsert = InferInsertModel<typeof users>;

export type UserRoleSummary = {
  id: string;
  slug: string;
  name: string;
};

// Un usuario sin filas en `user_roles` es `customer`: ese default lo resuelve
// `getEffectivePermissions()`, no este repositorio, que reporta lo que hay.
export type UserListRow = UserRow & {
  role: UserRoleSummary | null;
};

export type UpsertUserData = Pick<UserInsert, "clerkId" | "email"> &
  Partial<Pick<UserInsert, "firstName" | "lastName" | "imageUrl" | "isActive">>;

export type ListUsersParams = {
  page: number;
  pageSize: number;
  search?: string;
  isActive?: boolean;
  roleId?: string;
};

export type ListUsersResult = {
  rows: UserListRow[];
  total: number;
};

// `roleId` es `null` en el grupo de los usuarios sin fila en `user_roles`.
export type UserCountByRole = {
  roleId: string | null;
  roleSlug: string | null;
  roleName: string | null;
  total: number;
};

export type UserCountByStatus = {
  active: number;
  inactive: number;
};

function buildFilters(params: {
  search?: string;
  isActive?: boolean;
  roleId?: string;
}): SQL | undefined {
  const conditions: SQL[] = [];

  if (params.search) {
    const pattern = `%${params.search}%`;
    const match = or(
      ilike(users.email, pattern),
      ilike(users.firstName, pattern),
      ilike(users.lastName, pattern),
    );

    if (match) {
      conditions.push(match);
    }
  }

  if (params.isActive !== undefined) {
    conditions.push(eq(users.isActive, params.isActive));
  }

  if (params.roleId) {
    conditions.push(eq(userRoles.roleId, params.roleId));
  }

  return conditions.length > 0 ? and(...conditions) : undefined;
}

export const userRepository = {
  // Los webhooks de Clerk son at-least-once y sin orden garantizado: la
  // sincronización es siempre upsert por `clerk_id`, nunca insert a secas.
  async upsertByClerkId(
    data: UpsertUserData,
    db: Db | Tx = getDb(),
  ): Promise<UserRow> {
    const [row] = await db
      .insert(users)
      .values(data)
      .onConflictDoUpdate({
        target: users.clerkId,
        set: {
          email: data.email,
          firstName: data.firstName ?? null,
          lastName: data.lastName ?? null,
          imageUrl: data.imageUrl ?? null,
          updatedAt: new Date(),
        },
      })
      .returning();

    return row;
  },

  async findByClerkId(
    clerkId: string,
    db: Db | Tx = getDb(),
  ): Promise<UserRow | null> {
    const [row] = await db
      .select()
      .from(users)
      .where(eq(users.clerkId, clerkId))
      .limit(1);

    return row ?? null;
  },

  // Misma forma que una fila del listado, para que los handlers de detalle
  // respondan el mismo `UserListItem` sin recomponerlo a mano.
  async findByIdWithRole(
    id: string,
    db: Db | Tx = getDb(),
  ): Promise<UserListRow | null> {
    const [row] = await db
      .select({
        user: users,
        role: {
          id: roles.id,
          slug: roles.slug,
          name: roles.name,
        },
      })
      .from(users)
      .leftJoin(userRoles, eq(userRoles.userId, users.id))
      .leftJoin(roles, eq(roles.id, userRoles.roleId))
      .where(eq(users.id, id))
      .limit(1);

    return row ? { ...row.user, role: row.role } : null;
  },

  // Un solo leftJoin resuelve el rol de todas las filas: sin esto el listado
  // dispararía una consulta por usuario (N+1).
  async list(
    params: ListUsersParams,
    db: Db | Tx = getDb(),
  ): Promise<ListUsersResult> {
    const where = buildFilters(params);

    const [rows, totalRows] = await Promise.all([
      db
        .select({
          user: users,
          role: {
            id: roles.id,
            slug: roles.slug,
            name: roles.name,
          },
        })
        .from(users)
        .leftJoin(userRoles, eq(userRoles.userId, users.id))
        .leftJoin(roles, eq(roles.id, userRoles.roleId))
        .where(where)
        .orderBy(desc(users.createdAt))
        .limit(params.pageSize)
        .offset((params.page - 1) * params.pageSize),
      db
        .select({ value: count() })
        .from(users)
        .leftJoin(userRoles, eq(userRoles.userId, users.id))
        .where(where),
    ]);

    return {
      rows: rows.map((row) => ({ ...row.user, role: row.role })),
      total: totalRows[0]?.value ?? 0,
    };
  },

  // Métricas: la cuenta la hace Postgres con `count` + `group by`. Traer las
  // filas y contarlas en JS sería `SELECT *` sobre toda la tabla de usuarios.
  async countByRole(db: Db | Tx = getDb()): Promise<UserCountByRole[]> {
    return db
      .select({
        roleId: roles.id,
        roleSlug: roles.slug,
        roleName: roles.name,
        total: count(users.id),
      })
      .from(users)
      .leftJoin(userRoles, eq(userRoles.userId, users.id))
      .leftJoin(roles, eq(roles.id, userRoles.roleId))
      .groupBy(roles.id, roles.slug, roles.name)
      .orderBy(desc(count(users.id)));
  },

  async countByStatus(db: Db | Tx = getDb()): Promise<UserCountByStatus> {
    const rows = await db
      .select({ isActive: users.isActive, total: count() })
      .from(users)
      .groupBy(users.isActive);

    return {
      active: rows.find((row) => row.isActive)?.total ?? 0,
      inactive: rows.find((row) => !row.isActive)?.total ?? 0,
    };
  },

  /**
   * Customer de Stripe del usuario. Se lee suelto y no con `findByClerkId`
   * porque quien lo necesita ya tiene la fila y solo le falta esta columna.
   */
  async findStripeCustomerId(
    userId: string,
    db: Db | Tx = getDb(),
  ): Promise<string | null> {
    const [row] = await db
      .select({ stripeCustomerId: users.stripeCustomerId })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    return row?.stripeCustomerId ?? null;
  },

  /**
   * Guarda el Customer recién creado. La guarda `stripe_customer_id IS NULL`
   * hace que dos altas simultáneas no se pisen: la segunda no actualiza nada y
   * devuelve `null`, señal de que hay que quedarse con el Customer ya guardado.
   */
  async setStripeCustomerId(
    userId: string,
    stripeCustomerId: string,
    db: Db | Tx = getDb(),
  ): Promise<string | null> {
    const [row] = await db
      .update(users)
      .set({ stripeCustomerId })
      .where(and(eq(users.id, userId), isNull(users.stripeCustomerId)))
      .returning({ stripeCustomerId: users.stripeCustomerId });

    return row?.stripeCustomerId ?? null;
  },

  async setActive(
    id: string,
    isActive: boolean,
    db: Db | Tx = getDb(),
  ): Promise<UserRow | null> {
    const [row] = await db
      .update(users)
      .set({ isActive })
      .where(eq(users.id, id))
      .returning();

    return row ?? null;
  },
};
