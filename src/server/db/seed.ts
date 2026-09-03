import { config } from "dotenv";
import { isNull } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { categories } from "./schema/category";
import { permissions } from "./schema/permission";
import { products } from "./schema/product";
import { roles } from "./schema/role";
import { rolePermissions } from "./schema/role-permission";

import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

config({ path: ".env.local" });

type PermissionSeed = {
  code: string;
  resource: string;
  action: string;
  description: string;
};

// Catálogo cerrado: los permisos nacen del código, nunca de la UI. La
// descripción va en español porque es lo que lee la persona en la matriz.
const PERMISSION_SEEDS: PermissionSeed[] = [
  {
    code: "panel.access",
    resource: "panel",
    action: "access",
    description: "Entrar al panel de administración.",
  },
  {
    code: "categories.create",
    resource: "categories",
    action: "create",
    description: "Crear categorías.",
  },
  {
    code: "categories.read",
    resource: "categories",
    action: "read",
    description: "Ver el listado de categorías.",
  },
  {
    code: "categories.update",
    resource: "categories",
    action: "update",
    description: "Editar categorías existentes.",
  },
  {
    code: "categories.delete",
    resource: "categories",
    action: "delete",
    description: "Eliminar categorías.",
  },
  {
    code: "products.create",
    resource: "products",
    action: "create",
    description: "Crear productos.",
  },
  {
    code: "products.read",
    resource: "products",
    action: "read",
    description: "Ver el listado de productos.",
  },
  {
    code: "products.update",
    resource: "products",
    action: "update",
    description: "Editar productos existentes.",
  },
  {
    code: "products.delete",
    resource: "products",
    action: "delete",
    description: "Eliminar productos.",
  },
  {
    code: "orders.read",
    resource: "orders",
    action: "read",
    description: "Ver los pedidos.",
  },
  {
    code: "orders.update_status",
    resource: "orders",
    action: "update_status",
    description: "Cambiar el estado de un pedido.",
  },
  {
    code: "users.read",
    resource: "users",
    action: "read",
    description: "Ver el listado de usuarios.",
  },
  {
    code: "users.create",
    resource: "users",
    action: "create",
    description: "Invitar usuarios nuevos.",
  },
  {
    code: "users.update",
    resource: "users",
    action: "update",
    description: "Cambiar el rol de un usuario.",
  },
  {
    code: "users.deactivate",
    resource: "users",
    action: "deactivate",
    description: "Activar o desactivar usuarios.",
  },
  {
    code: "users.assign_privileged_role",
    resource: "users",
    action: "assign_privileged_role",
    description: "Asignar los roles Administrador y Super administrador.",
  },
  {
    code: "roles.read",
    resource: "roles",
    action: "read",
    description: "Ver los roles y sus permisos.",
  },
  {
    code: "roles.manage_permissions",
    resource: "roles",
    action: "manage_permissions",
    description: "Modificar los permisos de cada rol.",
  },
  {
    code: "audit_logs.read",
    resource: "audit_logs",
    action: "read",
    description: "Consultar el registro de auditoría.",
  },
  {
    code: "metrics.read",
    resource: "metrics",
    action: "read",
    description: "Ver las métricas del panel.",
  },
];

// `all` evita listas quemadas: super_admin y admin se definen contra lo que
// exista en `permissions` en tiempo de seed, no contra una copia que se
// desincroniza cada vez que nace un permiso nuevo.
type RoleGrant =
  { kind: "all"; except?: string[] } | { kind: "codes"; codes: string[] };

type RoleSeed = {
  slug: string;
  name: string;
  description: string;
  grant: RoleGrant;
};

const ROLE_SEEDS: RoleSeed[] = [
  {
    slug: "super_admin",
    name: "Super administrador",
    description:
      "Control total: administra usuarios privilegiados y la matriz de permisos.",
    grant: { kind: "all" },
  },
  {
    slug: "admin",
    name: "Administrador",
    description:
      "Opera el catálogo y administra usuarios no privilegiados. No toca permisos.",
    grant: {
      kind: "all",
      except: ["users.assign_privileged_role", "roles.manage_permissions"],
    },
  },
  {
    slug: "manager",
    name: "Encargado",
    description:
      "Actualiza catálogo y pedidos desde el panel, sin crear ni eliminar.",
    grant: {
      kind: "codes",
      codes: [
        "panel.access",
        "categories.read",
        "categories.update",
        "products.read",
        "products.update",
        "orders.read",
        "orders.update_status",
        "metrics.read",
      ],
    },
  },
  {
    slug: "employee",
    name: "Empleado",
    description:
      "Atiende pedidos y stock. Sin acceso al panel de administración.",
    grant: {
      kind: "codes",
      codes: [
        "categories.read",
        "products.read",
        "products.update",
        "orders.read",
        "orders.update_status",
      ],
    },
  },
  {
    slug: "audit",
    name: "Auditoría",
    description: "Solo lectura de auditoría y métricas. Cero escritura.",
    grant: { kind: "codes", codes: ["audit_logs.read", "metrics.read"] },
  },
  {
    slug: "customer",
    name: "Cliente",
    description:
      "Comprador del storefront. Autoriza por propiedad del recurso, sin permisos de panel.",
    grant: { kind: "codes", codes: [] },
  },
];

type CategorySeed = {
  name: string;
  slug: string;
  description: string;
  imageUrl: string;
  isActive: boolean;
};

const CATEGORY_SEEDS: CategorySeed[] = [
  {
    name: "Laptops",
    slug: "laptops",
    description: "Portátiles para trabajo, estudio y gaming.",
    imageUrl: "https://images.unsplash.com/photo-1496181133206-80ce9b88a853",
    isActive: true,
  },
  {
    name: "Teclados",
    slug: "teclados",
    description: "Teclados mecánicos, inalámbricos y de membrana.",
    imageUrl: "https://images.unsplash.com/photo-1587829741301-dc798b83add3",
    isActive: true,
  },
  {
    name: "Monitores",
    slug: "monitores",
    description: "Pantallas desde 24 pulgadas hasta ultrawide 4K.",
    imageUrl: "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf",
    isActive: true,
  },
  {
    name: "Audio",
    slug: "audio",
    description: "Audífonos, parlantes y micrófonos.",
    imageUrl: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e",
    isActive: true,
  },
  {
    name: "Almacenamiento",
    slug: "almacenamiento",
    description: "Discos SSD, NVMe y unidades externas.",
    imageUrl: "https://images.unsplash.com/photo-1531492746076-161ca9bcad58",
    isActive: true,
  },
  {
    name: "Accesorios descontinuados",
    slug: "accesorios-descontinuados",
    description: "Categoría fuera de publicación, útil para probar filtros.",
    imageUrl: "https://images.unsplash.com/photo-1585792180666-f7347c490ee2",
    isActive: false,
  },
];

type ProductSeed = {
  categorySlug: string;
  name: string;
  slug: string;
  sku: string;
  description: string;
  priceCents: number;
  compareAtPriceCents: number | null;
  stock: number;
  imageUrl: string;
  isActive: boolean;
};

// Precios en centavos, siempre enteros: 549900 son S/ 5.499,00.
const PRODUCT_SEEDS: ProductSeed[] = [
  {
    categorySlug: "laptops",
    name: "Laptop Dell XPS 13 16GB",
    slug: "laptop-dell-xps-13-16gb",
    sku: "LAP-XPS13-16GB",
    description: "Ultrabook de 13 pulgadas con Core i7 y 512GB NVMe.",
    priceCents: 549900,
    compareAtPriceCents: 599900,
    stock: 12,
    imageUrl: "https://images.unsplash.com/photo-1496181133206-80ce9b88a853",
    isActive: true,
  },
  {
    categorySlug: "laptops",
    name: "Laptop Lenovo IdeaPad Gaming 3",
    slug: "laptop-lenovo-ideapad-gaming-3",
    sku: "LAP-IDEAPAD-G3",
    description: "Ryzen 7 con RTX 3050 y pantalla de 120Hz.",
    priceCents: 399900,
    compareAtPriceCents: null,
    stock: 7,
    imageUrl: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8",
    isActive: true,
  },
  {
    categorySlug: "teclados",
    name: "Teclado mecánico Keychron K2",
    slug: "teclado-mecanico-keychron-k2",
    sku: "TEC-K2-BROWN",
    description: "75% inalámbrico, switches marrones y retroiluminación RGB.",
    priceCents: 42900,
    compareAtPriceCents: 49900,
    stock: 30,
    imageUrl: "https://images.unsplash.com/photo-1587829741301-dc798b83add3",
    isActive: true,
  },
  {
    categorySlug: "teclados",
    name: "Teclado Logitech MX Keys",
    slug: "teclado-logitech-mx-keys",
    sku: "TEC-MXKEYS",
    description: "Teclado bajo perfil para productividad, multi dispositivo.",
    priceCents: 39900,
    compareAtPriceCents: null,
    stock: 0,
    imageUrl: "https://images.unsplash.com/photo-1618384887929-16ec33fab9ef",
    isActive: true,
  },
  {
    categorySlug: "monitores",
    name: 'Monitor LG UltraGear 27"',
    slug: "monitor-lg-ultragear-27",
    sku: "MON-LG-UG27",
    description: "QHD 165Hz con 1ms de respuesta para gaming.",
    priceCents: 129900,
    compareAtPriceCents: 149900,
    stock: 9,
    imageUrl: "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf",
    isActive: true,
  },
  {
    categorySlug: "audio",
    name: "Audífonos Sony WH-1000XM5",
    slug: "audifonos-sony-wh-1000xm5",
    sku: "AUD-WH1000XM5",
    description: "Cancelación de ruido líder y 30 horas de batería.",
    priceCents: 179900,
    compareAtPriceCents: null,
    stock: 15,
    imageUrl: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e",
    isActive: true,
  },
  {
    categorySlug: "almacenamiento",
    name: "SSD Samsung 980 Pro 1TB",
    slug: "ssd-samsung-980-pro-1tb",
    sku: "ALM-980PRO-1TB",
    description: "NVMe PCIe 4.0 con hasta 7000 MB/s de lectura.",
    priceCents: 49900,
    compareAtPriceCents: 59900,
    stock: 25,
    imageUrl: "https://images.unsplash.com/photo-1531492746076-161ca9bcad58",
    isActive: true,
  },
  {
    categorySlug: "almacenamiento",
    name: "Disco externo Seagate 2TB",
    slug: "disco-externo-seagate-2tb",
    sku: "ALM-SEAGATE-2TB",
    description: "Producto despublicado, útil para probar el filtro de estado.",
    priceCents: 29900,
    compareAtPriceCents: null,
    stock: 4,
    imageUrl: "https://images.unsplash.com/photo-1597872200969-2b65d56bd16b",
    isActive: false,
  },
];

// Cliente propio: `src/server/db/index.ts` importa `server-only`, que revienta
// fuera del bundler de Next (este script corre con tsx en Node puro). Mismo
// driver que el de la app: postgres-js con `prepare: false` por el pooler.
function createSeedClient() {
  const url = process.env.DATABASE_URL;

  if (!url) {
    throw new Error("DATABASE_URL no está definida.");
  }

  return postgres(url, { prepare: false, max: 1 });
}

type SeedDb = PostgresJsDatabase;

function resolveGrantedCodes(grant: RoleGrant, allCodes: string[]): string[] {
  if (grant.kind === "codes") {
    return grant.codes;
  }

  const excluded = new Set(grant.except ?? []);

  return allCodes.filter((code) => !excluded.has(code));
}

// Idempotente por `onConflictDoNothing`: reejecutar no duplica y tampoco pisa
// la matriz que `super_admin` haya recompuesto desde la UI.
async function seedRbac(db: SeedDb) {
  const insertedPermissions = await db
    .insert(permissions)
    .values(PERMISSION_SEEDS)
    .onConflictDoNothing({ target: permissions.code })
    .returning({ code: permissions.code });

  console.log(
    `Seed de permisos: ${insertedPermissions.length} nuevos de ${PERMISSION_SEEDS.length}.`,
  );

  const insertedRoles = await db
    .insert(roles)
    .values(
      ROLE_SEEDS.map((role) => ({
        slug: role.slug,
        name: role.name,
        description: role.description,
        isSystem: true,
      })),
    )
    .onConflictDoNothing({ target: roles.slug })
    .returning({ slug: roles.slug });

  console.log(
    `Seed de roles: ${insertedRoles.length} nuevos de ${ROLE_SEEDS.length}.`,
  );

  // Roles y permisos se anclan por slug/code: los ids son aleatorios y cambian
  // entre entornos.
  const permissionRows = await db
    .select({ id: permissions.id, code: permissions.code })
    .from(permissions);

  const roleRows = await db
    .select({ id: roles.id, slug: roles.slug })
    .from(roles);

  const permissionIdByCode = new Map(
    permissionRows.map((row) => [row.code, row.id]),
  );
  const roleIdBySlug = new Map(roleRows.map((row) => [row.slug, row.id]));
  const allCodes = permissionRows.map((row) => row.code);

  const grants = ROLE_SEEDS.flatMap((role) => {
    const roleId = roleIdBySlug.get(role.slug);

    if (!roleId) {
      throw new Error(`No existe el rol "${role.slug}" después del seed.`);
    }

    return resolveGrantedCodes(role.grant, allCodes).map((code) => {
      const permissionId = permissionIdByCode.get(code);

      if (!permissionId) {
        throw new Error(
          `El rol "${role.slug}" referencia el permiso inexistente "${code}".`,
        );
      }

      return { roleId, permissionId };
    });
  });

  const insertedGrants = await db
    .insert(rolePermissions)
    .values(grants)
    .onConflictDoNothing()
    .returning({ roleId: rolePermissions.roleId });

  console.log(
    `Seed de role_permissions: ${insertedGrants.length} nuevos de ${grants.length}.`,
  );
}

async function seedCatalog(db: SeedDb) {
  // El índice único es parcial: el target del conflicto debe repetir su
  // predicado para que Postgres pueda inferirlo.
  const inserted = await db
    .insert(categories)
    .values(CATEGORY_SEEDS)
    .onConflictDoNothing({
      target: categories.slug,
      where: isNull(categories.deletedAt),
    })
    .returning({ slug: categories.slug });

  console.log(
    `Seed de categorías: ${inserted.length} nuevas de ${CATEGORY_SEEDS.length}.`,
  );

  // Los productos se anclan por slug de categoría: el id es aleatorio y cambia
  // entre entornos.
  const categoryRows = await db
    .select({ id: categories.id, slug: categories.slug })
    .from(categories)
    .where(isNull(categories.deletedAt));

  const categoryIdBySlug = new Map(
    categoryRows.map((row) => [row.slug, row.id]),
  );

  const productValues = PRODUCT_SEEDS.map((seed) => {
    const categoryId = categoryIdBySlug.get(seed.categorySlug);

    if (!categoryId) {
      throw new Error(
        `No existe la categoría "${seed.categorySlug}" para el producto "${seed.slug}".`,
      );
    }

    return {
      name: seed.name,
      slug: seed.slug,
      sku: seed.sku,
      description: seed.description,
      priceCents: seed.priceCents,
      compareAtPriceCents: seed.compareAtPriceCents,
      stock: seed.stock,
      categoryId,
      imageUrl: seed.imageUrl,
      isActive: seed.isActive,
    };
  });

  const insertedProducts = await db
    .insert(products)
    .values(productValues)
    .onConflictDoNothing({
      target: products.slug,
      where: isNull(products.deletedAt),
    })
    .returning({ slug: products.slug });

  console.log(
    `Seed de productos: ${insertedProducts.length} nuevos de ${PRODUCT_SEEDS.length}.`,
  );
}

async function seed() {
  const client = createSeedClient();
  const db = drizzle(client);

  try {
    await seedRbac(db);
    await seedCatalog(db);
  } finally {
    await client.end();
  }
}

seed()
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
