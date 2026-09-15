// Pruebas unitarias de src/server/repositories/category.repository.ts — bloqueadas.
//
// BLOQUEO: doble. (1) El archivo abre con `import "server-only"`, que lanza en
// el propio import bajo `tsx --test` ("This module cannot be imported from a
// Client Component module"); verificado con un import real. (2) Los siete
// métodos son consultas Drizzle contra `getDb()`, resuelto dentro del módulo y
// sin punto de inyección. Lo que valdría la pena fijar —el filtro `alive()` de
// borrado lógico, el `softDelete` que escribe `deletedAt` en vez de borrar la
// fila, la exclusión de un id propio en `existsBySlug` y la traducción del
// índice único a `SlugConflictError`— solo se observa contra una base real: el
// error de unicidad lo emite Postgres, no el código. `alive` y `buildFilters` no
// se exportan. Fabricar un `db` falso está prohibido por la política del loop.
// DESBLOQUEO (fuera de alcance): pruebas de integración contra una Postgres
// desechable en un script aparte, con el segundo runner que pide el punto 2 de
// la escalación. La única pieza aislable hoy —`isUniqueViolation`, de
// `lib/api-error.ts`— ya está cubierta con 15 tests reales en su propio archivo.
import { describe, it } from "node:test";

describe("categoryRepository.list", () => {
  it.todo("lists live categories paginated, with search and dynamic ordering");
});

describe("categoryRepository.listPublic", () => {
  it.todo("lists every live and active category unpaginated, with the public projection");
});

describe("categoryRepository.findById", () => {
  it.todo("finds a live category by id");
});

describe("categoryRepository.existsBySlug", () => {
  it.todo("checks whether a slug already exists among live categories, optionally excluding one id");
});

describe("categoryRepository.create", () => {
  it.todo("inserts a category, translating the unique index violation into SlugConflictError");
});

describe("categoryRepository.update", () => {
  it.todo("updates a live category by id with the same slug conflict mapping");
});

describe("categoryRepository.softDelete", () => {
  it.todo("sets deletedAt instead of physically deleting the row");
});
