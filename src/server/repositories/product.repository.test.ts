// Pruebas unitarias de src/server/repositories/product.repository.ts — bloqueadas.
//
// BLOQUEO: doble. (1) El archivo abre con `import "server-only"`, que lanza en
// el propio import bajo `tsx --test` ("This module cannot be imported from a
// Client Component module"); verificado con un import real. (2) Los once
// métodos son consultas Drizzle contra `getDb()`, resuelto dentro del módulo y
// sin punto de inyección. Aquí el bloqueo duele más que en otros repositorios
// porque el criterio público —producto activo Y categoría activa Y no
// borrado— y el descuento que se calcula en SQL para ordenar por oferta están
// expresados como expresiones de Postgres, no como código JS: solo un motor
// real dice si el `ORDER BY` del descuento o los filtros de precio/stock
// aciertan. Igual que en categorías, `SlugConflictError` nace de un índice
// único de la base. Un doble de Drizzle está prohibido por la política del loop.
// DESBLOQUEO (fuera de alcance): pruebas de integración contra una Postgres
// desechable en un script aparte, con el segundo runner del punto 2 de la
// escalación. El formato de precios y el catálogo del lado cliente
// (`lib/format.ts`, `storefront/lib/catalog.ts`) sí son puros y ya están
// cubiertos con tests reales.
//
// `updateCost` (spec 016) es el caso más extremo del bloqueo: lo que hay que
// comprobar es el `SELECT ... FOR UPDATE` que evita que dos ediciones
// concurrentes registren un costo anterior que nunca existió, y un lock solo se
// observa con dos transacciones reales contra Postgres. Lo que sí es puro de esa
// feature —el margen y la redacción del costo— está cubierto con tests reales en
// `modules/finance/lib/{margin,cost-redaction}.test.ts`.
import { describe, it } from "node:test";

describe("productRepository.list", () => {
  it.todo("lists live products for the admin panel, paginated, with search, category/status filters and dynamic ordering");
  it.todo("filters by maxStock inclusively, treating maxStock 0 as a valid filter, and breaks ties by id so paging does not repeat or skip rows");
});

describe("productRepository.listPublic", () => {
  it.todo("lists public products (active, with an active category) with price/stock/offer filters and ordering including the discount computed in SQL");
});

describe("productRepository.findPublicBySlug", () => {
  it.todo("finds a product's public detail by slug using the same public criteria as the listing");
});

describe("productRepository.findManyActiveByIds", () => {
  it.todo("resolves several cart lines in one query, returning only the public products found");
});

describe("productRepository.findById", () => {
  it.todo("finds a live product by id for the admin panel");
});

describe("productRepository.existsBySlug", () => {
  it.todo("checks whether a slug already exists among live products, optionally excluding one id");
});

describe("productRepository.existsBySku", () => {
  it.todo("checks whether a SKU already exists among live products, optionally excluding one id");
});

describe("productRepository.create", () => {
  it.todo("inserts a product, translating the unique index violation into SlugConflictError");
});

describe("productRepository.update", () => {
  it.todo("updates a live product by id with the same conflict mapping");
});

describe("productRepository.adjustStock", () => {
  it.todo("adds the delta atomically with the stock >= -delta guard in the WHERE, and discriminates ok / not_found / insufficient by re-reading the stock in the same transaction");
});

describe("productRepository.updateCost", () => {
  it.todo("locks the row with SELECT ... FOR UPDATE before writing, so the audited `before` cost is the one that really preceded the change");
  it.todo("discriminates ok / not_found / unchanged, treating null → null as unchanged so no audit row is written for a no-op");
});

describe("productRepository.softDelete", () => {
  it.todo("sets deletedAt instead of physically deleting the row");
});
