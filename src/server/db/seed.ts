import { config } from "dotenv";
import { isNull, sql } from "drizzle-orm";
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
  {
    code: "product_cost.view",
    resource: "product_cost",
    action: "view",
    description: "Ver el costo y el margen de los productos.",
  },
  {
    code: "product_cost.update",
    resource: "product_cost",
    action: "update",
    description: "Editar el costo de los productos.",
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

// Precios en centavos de sol, siempre enteros: 699900 son S/ 6.999,00.
// Cada `imageUrl` se verificó con curl: 200 + content-type image/jpeg.
const PRODUCT_SEEDS: ProductSeed[] = [
  // ── Laptops ──────────────────────────────────────────────────────────────
  {
    categorySlug: "laptops",
    name: "Laptop Dell XPS 13 9350 Core Ultra 7 16GB",
    slug: "laptop-dell-xps-13-16gb",
    sku: "LAP-XPS13-16GB",
    description:
      "Ultrabook de 13.4 pulgadas FHD+ 120Hz con Intel Core Ultra 7 256V, 16GB LPDDR5X y 512GB NVMe.",
    priceCents: 699900,
    compareAtPriceCents: 749900,
    stock: 12,
    imageUrl: "https://m.media-amazon.com/images/I/81KlG8GrgkL._AC_SL1200_.jpg",
    isActive: true,
  },
  {
    categorySlug: "laptops",
    name: "Laptop Lenovo IdeaPad Gaming 3 RTX 3050 Ti",
    slug: "laptop-lenovo-ideapad-gaming-3",
    sku: "LAP-IDEAPAD-G3",
    description:
      "Ryzen 5 5600H con RTX 3050 Ti, 8GB DDR4, 512GB SSD y pantalla 15.6 pulgadas FHD 120Hz.",
    priceCents: 349900,
    compareAtPriceCents: null,
    stock: 7,
    imageUrl: "https://m.media-amazon.com/images/I/71HxVwbYkHL._AC_SL1200_.jpg",
    isActive: true,
  },
  {
    categorySlug: "laptops",
    name: "Laptop ASUS Zenbook 14 OLED Core Ultra 7",
    slug: "laptop-asus-zenbook-14-oled",
    sku: "LAP-ZENBOOK14-OLED",
    description:
      "Pantalla OLED táctil de 14 pulgadas, Intel Core Ultra 7 255H, 16GB LPDDR5X y 1TB SSD en 1.2 kg.",
    priceCents: 429900,
    compareAtPriceCents: null,
    stock: 6,
    imageUrl: "https://m.media-amazon.com/images/I/71mApMiwKpL._AC_SL1200_.jpg",
    isActive: true,
  },
  {
    categorySlug: "laptops",
    name: "Laptop HP Victus 15 RTX 4050",
    slug: "laptop-hp-victus-15",
    sku: "LAP-VICTUS15-RTX",
    description:
      "Gaming de 15.6 pulgadas IPS 144Hz con Core i5-13420H, 16GB DDR4, 512GB SSD y RTX 4050.",
    priceCents: 389900,
    compareAtPriceCents: 429900,
    stock: 10,
    imageUrl: "https://m.media-amazon.com/images/I/71lmgwUYHXL._AC_SL1200_.jpg",
    isActive: true,
  },
  {
    categorySlug: "laptops",
    name: "Laptop Acer Aspire 5 Core i5 13420H",
    slug: "laptop-acer-aspire-5",
    sku: "LAP-ASPIRE5-I5",
    description:
      "15.6 pulgadas Full HD táctil con Core i5-13420H, 8GB DDR5 y 512GB SSD para estudio y oficina.",
    priceCents: 249900,
    compareAtPriceCents: null,
    stock: 18,
    imageUrl: "https://m.media-amazon.com/images/I/61kojoLeN5L._AC_SL1200_.jpg",
    isActive: true,
  },

  // ── Teclados ─────────────────────────────────────────────────────────────
  {
    categorySlug: "teclados",
    name: "Teclado mecánico Keychron K2",
    slug: "teclado-mecanico-keychron-k2",
    sku: "TEC-K2-BROWN",
    description:
      "Layout 75% de 84 teclas, Bluetooth y USB-C, hot-swappable y retroiluminación RGB.",
    priceCents: 42900,
    compareAtPriceCents: 49900,
    stock: 30,
    imageUrl: "https://m.media-amazon.com/images/I/61dXb5X1mYL._AC_SL1200_.jpg",
    isActive: true,
  },
  {
    categorySlug: "teclados",
    name: "Teclado Logitech MX Keys",
    slug: "teclado-logitech-mx-keys",
    sku: "TEC-MXKEYS",
    description:
      "Bajo perfil con teclas cóncavas, retroiluminación automática y hasta tres equipos emparejados.",
    priceCents: 54900,
    compareAtPriceCents: null,
    stock: 0,
    imageUrl: "https://m.media-amazon.com/images/I/71gOLg2-kqL._AC_SL1200_.jpg",
    isActive: true,
  },
  {
    categorySlug: "teclados",
    name: "Teclado Razer BlackWidow V4 X",
    slug: "teclado-razer-blackwidow-v4-x",
    sku: "TEC-BW-V4X",
    description:
      "Mecánico full size con switches Green táctiles, 6 teclas macro y Chroma RGB.",
    priceCents: 64900,
    compareAtPriceCents: 74900,
    stock: 14,
    imageUrl: "https://m.media-amazon.com/images/I/71qoXjgRb-L._AC_SL1200_.jpg",
    isActive: true,
  },
  {
    categorySlug: "teclados",
    name: "Teclado mecánico Redragon K552P Kumara",
    slug: "teclado-redragon-k552p-kumara",
    sku: "TEC-K552P",
    description:
      "TKL de 87 teclas con switches rojos hot-swappable, 18 modos de iluminación y anti-ghosting.",
    priceCents: 19900,
    compareAtPriceCents: 24900,
    stock: 40,
    imageUrl: "https://m.media-amazon.com/images/I/71lQnVCMmXL._AC_SL1200_.jpg",
    isActive: true,
  },
  {
    categorySlug: "teclados",
    name: "Teclado HyperX Alloy Origins Core",
    slug: "teclado-hyperx-alloy-origins-core",
    sku: "TEC-ALLOY-CORE",
    description:
      "Tenkeyless de cuerpo de aluminio con switches HyperX Red y cable USB-C desmontable.",
    priceCents: 37900,
    compareAtPriceCents: null,
    stock: 11,
    imageUrl: "https://m.media-amazon.com/images/I/713HboKyvoL._AC_SL1200_.jpg",
    isActive: true,
  },

  // ── Monitores ────────────────────────────────────────────────────────────
  {
    categorySlug: "monitores",
    name: 'Monitor LG UltraGear 27GP850-B 27"',
    slug: "monitor-lg-ultragear-27",
    sku: "MON-LG-UG27",
    description:
      "Nano IPS QHD 2560x1440 a 165Hz con 1ms, G-Sync Compatible y FreeSync Premium.",
    priceCents: 149900,
    compareAtPriceCents: 169900,
    stock: 9,
    imageUrl: "https://m.media-amazon.com/images/I/71PVdlAD4lL._AC_SL1200_.jpg",
    isActive: true,
  },
  {
    categorySlug: "monitores",
    name: 'Monitor Samsung Odyssey G5 27" QHD',
    slug: "monitor-samsung-odyssey-g5-27",
    sku: "MON-SAM-G5-27",
    description:
      "QHD 2560x1440 a 180Hz con 1ms, HDR10 y soporte con ajuste de altura.",
    priceCents: 109900,
    compareAtPriceCents: null,
    stock: 13,
    imageUrl: "https://m.media-amazon.com/images/I/71HCnFPkVhL._AC_SL1200_.jpg",
    isActive: true,
  },
  {
    categorySlug: "monitores",
    name: 'Monitor Dell UltraSharp U2422H 24"',
    slug: "monitor-dell-ultrasharp-u2422h",
    sku: "MON-DELL-U2422H",
    description:
      "IPS Full HD de 23.8 pulgadas con cobertura sRGB 99%, hub USB y soporte ergonómico.",
    priceCents: 129900,
    compareAtPriceCents: 144900,
    stock: 8,
    imageUrl: "https://m.media-amazon.com/images/I/812VswIbb4L._AC_SL1200_.jpg",
    isActive: true,
  },
  {
    categorySlug: "monitores",
    name: 'Monitor ASUS TUF Gaming VG249Q1A 24"',
    slug: "monitor-asus-tuf-vg249q1a",
    sku: "MON-ASUS-VG249Q1A",
    description:
      "IPS Full HD de 23.8 pulgadas a 165Hz con 1ms MPRT, ELMB y FreeSync Premium.",
    priceCents: 69900,
    compareAtPriceCents: null,
    stock: 16,
    imageUrl: "https://m.media-amazon.com/images/I/61wOrOwqEiL._AC_SL1200_.jpg",
    isActive: true,
  },
  {
    categorySlug: "monitores",
    name: 'Monitor AOC 24B2XH 24"',
    slug: "monitor-aoc-24b2xh",
    sku: "MON-AOC-24B2XH",
    description:
      "IPS Full HD de 23.8 pulgadas sin marcos, 75Hz, entradas HDMI y VGA, compatible VESA.",
    priceCents: 44900,
    compareAtPriceCents: 51900,
    stock: 22,
    imageUrl: "https://m.media-amazon.com/images/I/61vEoTP35IL._AC_SL1200_.jpg",
    isActive: true,
  },

  // ── Audio ────────────────────────────────────────────────────────────────
  {
    categorySlug: "audio",
    name: "Audífonos Sony WH-1000XM5",
    slug: "audifonos-sony-wh-1000xm5",
    sku: "AUD-WH1000XM5",
    description:
      "Cancelación de ruido adaptativa con 8 micrófonos, 30 horas de batería y carga rápida USB-C.",
    priceCents: 159900,
    compareAtPriceCents: 179900,
    stock: 15,
    imageUrl: "https://m.media-amazon.com/images/I/61O3iMlnJIL._AC_SL1200_.jpg",
    isActive: true,
  },
  {
    categorySlug: "audio",
    name: "Audífonos JBL Tune 510BT",
    slug: "audifonos-jbl-tune-510bt",
    sku: "AUD-JBL-510BT",
    description:
      "On-ear Bluetooth 5.0 con JBL Pure Bass, 40 horas de batería y diseño plegable.",
    priceCents: 16900,
    compareAtPriceCents: null,
    stock: 35,
    imageUrl: "https://m.media-amazon.com/images/I/61q2zYSX7DL._AC_SL1200_.jpg",
    isActive: true,
  },
  {
    categorySlug: "audio",
    name: "Headset Logitech G Pro X",
    slug: "headset-logitech-g-pro-x",
    sku: "AUD-GPROX",
    description:
      "Drivers de 50mm, sonido envolvente DTS 7.1 y micrófono desmontable con Blue VO!CE.",
    priceCents: 44900,
    compareAtPriceCents: 52900,
    stock: 12,
    imageUrl: "https://m.media-amazon.com/images/I/51j6CXF9DYL._AC_SL1200_.jpg",
    isActive: true,
  },
  {
    categorySlug: "audio",
    name: "Headset HyperX Cloud II",
    slug: "headset-hyperx-cloud-ii",
    sku: "AUD-CLOUD2",
    description:
      "Sonido envolvente 7.1 virtual, almohadillas de memory foam y marco de aluminio.",
    priceCents: 37900,
    compareAtPriceCents: null,
    stock: 20,
    imageUrl: "https://m.media-amazon.com/images/I/71ltsViEA8L._AC_SL1200_.jpg",
    isActive: true,
  },
  {
    categorySlug: "audio",
    name: "Micrófono FIFINE K669B USB",
    slug: "microfono-fifine-k669b",
    sku: "AUD-FIFINE-K669B",
    description:
      "Condensador cardioide USB con cuerpo metálico y control de volumen, plug and play.",
    priceCents: 14900,
    compareAtPriceCents: null,
    stock: 26,
    imageUrl: "https://m.media-amazon.com/images/I/51frr1QHyZL._AC_SL1200_.jpg",
    isActive: true,
  },

  // ── Almacenamiento ───────────────────────────────────────────────────────
  {
    categorySlug: "almacenamiento",
    name: "SSD Samsung 980 Pro 1TB NVMe",
    slug: "ssd-samsung-980-pro-1tb",
    sku: "ALM-980PRO-1TB",
    description:
      "M.2 2280 PCIe 4.0 con hasta 7000 MB/s de lectura y control térmico integrado.",
    priceCents: 44900,
    compareAtPriceCents: 52900,
    stock: 25,
    imageUrl: "https://m.media-amazon.com/images/I/61sveEgbI2L._AC_SL1200_.jpg",
    isActive: true,
  },
  {
    categorySlug: "almacenamiento",
    name: "SSD WD_BLACK SN770 1TB NVMe",
    slug: "ssd-wd-black-sn770-1tb",
    sku: "ALM-SN770-1TB",
    description:
      "M.2 2280 PCIe Gen4 sin DRAM con hasta 5150 MB/s, pensado para gaming.",
    priceCents: 32900,
    compareAtPriceCents: null,
    stock: 19,
    imageUrl: "https://m.media-amazon.com/images/I/71Sr1zjPhwL._AC_SL1200_.jpg",
    isActive: true,
  },
  {
    categorySlug: "almacenamiento",
    name: "SSD Kingston NV3 1TB NVMe",
    slug: "ssd-kingston-nv3-1tb",
    sku: "ALM-NV3-1TB",
    description:
      "M.2 2280 PCIe 4.0 x4 con hasta 6000 MB/s, opción de entrada para actualizar laptops.",
    priceCents: 24900,
    compareAtPriceCents: 29900,
    stock: 32,
    imageUrl: "https://m.media-amazon.com/images/I/71c5uuoM1bL._AC_SL1200_.jpg",
    isActive: true,
  },
  {
    categorySlug: "almacenamiento",
    name: "SSD Crucial P310 1TB NVMe",
    slug: "ssd-crucial-p310-1tb",
    sku: "ALM-P310-1TB",
    description:
      "M.2 2280 PCIe Gen4 con hasta 7100 MB/s, compatible con laptops, PC y consolas portátiles.",
    priceCents: 28900,
    compareAtPriceCents: null,
    stock: 21,
    imageUrl: "https://m.media-amazon.com/images/I/51iNNIdPqkL._AC_SL1200_.jpg",
    isActive: true,
  },
  {
    categorySlug: "almacenamiento",
    name: "Disco externo Seagate One Touch 2TB",
    slug: "disco-externo-seagate-2tb",
    sku: "ALM-SEAGATE-2TB",
    description:
      "HDD portátil USB 3.0 de 2TB para respaldo en PC y Mac, sin fuente de poder externa.",
    priceCents: 29900,
    compareAtPriceCents: null,
    stock: 4,
    imageUrl: "https://m.media-amazon.com/images/I/817o7I64M0L._AC_SL1200_.jpg",
    isActive: true,
  },

  // ── Accesorios descontinuados (categoría inactiva) ───────────────────────
  {
    categorySlug: "accesorios-descontinuados",
    name: "Mouse inalámbrico Logitech M170",
    slug: "mouse-logitech-m170",
    sku: "ACC-M170",
    description:
      "Ambidiestro de 2.4 GHz con receptor nano USB-A y hasta 12 meses de batería.",
    priceCents: 4900,
    compareAtPriceCents: null,
    stock: 45,
    imageUrl: "https://m.media-amazon.com/images/I/51tTYBtpzjL._AC_SL1200_.jpg",
    isActive: true,
  },
  {
    categorySlug: "accesorios-descontinuados",
    name: "Webcam Logitech C270 HD",
    slug: "webcam-logitech-c270",
    sku: "ACC-C270",
    description:
      "720p a 30 fps con micrófono con reducción de ruido y corrección automática de luz.",
    priceCents: 12900,
    compareAtPriceCents: 14900,
    stock: 17,
    imageUrl: "https://m.media-amazon.com/images/I/61yo4swj-PL._AC_SL1200_.jpg",
    isActive: true,
  },
  {
    categorySlug: "accesorios-descontinuados",
    name: "Hub USB Anker de 4 puertos",
    slug: "hub-usb-anker-4-puertos",
    sku: "ACC-ANKER-HUB4",
    description:
      "Divisor USB-A 4 en 1 con transferencia de 5 Gbps y cable de 60 cm, sin drivers.",
    priceCents: 7900,
    compareAtPriceCents: null,
    stock: 28,
    imageUrl: "https://m.media-amazon.com/images/I/61cJHLsLNuL._AC_SL1200_.jpg",
    isActive: true,
  },
  {
    categorySlug: "accesorios-descontinuados",
    name: "Combo teclado y mouse Logitech MK120",
    slug: "combo-logitech-mk120",
    sku: "ACC-MK120",
    description:
      "Combo alámbrico USB despublicado, útil para probar el filtro de estado y el agotado.",
    priceCents: 7900,
    compareAtPriceCents: null,
    stock: 0,
    imageUrl: "https://m.media-amazon.com/images/I/717IbQpOStL._AC_SL1200_.jpg",
    isActive: false,
  },
  {
    categorySlug: "accesorios-descontinuados",
    name: "Mousepad de vidrio Redragon PG1M",
    slug: "mousepad-redragon-pg1m",
    sku: "ACC-PG1M",
    description:
      "Superficie de vidrio templado ultra lisa con base antideslizante, fácil de limpiar.",
    priceCents: 9900,
    compareAtPriceCents: 12900,
    stock: 24,
    imageUrl: "https://m.media-amazon.com/images/I/61RGGFnjAGL._AC_SL1200_.jpg",
    isActive: true,
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

  // A diferencia de las categorías, aquí el seed sí pisa: el catálogo de demo
  // es dato de referencia y reejecutar tiene que corregir precio, stock y foto.
  // `targetWhere` repite el predicado del índice parcial; sin él Postgres no
  // infiere `products_slug_active_unq` y el ON CONFLICT falla.
  const seededProducts = await db
    .insert(products)
    .values(productValues)
    .onConflictDoUpdate({
      target: products.slug,
      targetWhere: isNull(products.deletedAt),
      set: {
        name: sql`excluded.name`,
        sku: sql`excluded.sku`,
        description: sql`excluded.description`,
        priceCents: sql`excluded.price_cents`,
        compareAtPriceCents: sql`excluded.compare_at_price_cents`,
        stock: sql`excluded.stock`,
        categoryId: sql`excluded.category_id`,
        imageUrl: sql`excluded.image_url`,
        isActive: sql`excluded.is_active`,
        updatedAt: new Date(),
      },
    })
    .returning({ slug: products.slug });

  console.log(
    `Seed de productos: ${seededProducts.length} filas sembradas o actualizadas de ${PRODUCT_SEEDS.length}.`,
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
