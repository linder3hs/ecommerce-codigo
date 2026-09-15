// Pruebas unitarias de src/modules/categories/services/category.service.ts — bloqueadas.
//
// BLOQUEO: el módulo importa la instancia `api` de `@/lib/axios`, un singleton
// creado en tiempo de import y sin punto de inyección de transporte. Smoke-check
// con un import real bajo `tsx`: el módulo carga sin romper, así que lo que
// falta es la costura, no el runner. Los cinco métodos son CRUD passthrough
// —concatenar el id a la URL, pasar `params` o el body y devolver `data`—
// idénticos en forma a los de `product.service.ts`, sin una sola decisión
// propia. Verificarlos exigiría una pieza falsa, prohibido por la política del
// loop, y solo fijaría la implementación.
// DESBLOQUEO (fuera de alcance): recibir el cliente HTTP como parámetro/factory
// en vez de importarlo. La lógica de categorías que sí vale la pena probar está
// en los esquemas Zod y en el repositorio (slug único, borrado lógico).
import { describe, it } from "node:test";

describe("categoryService.list", () => {
  it.todo("GET /categories for the admin panel with the given query parameters");
});

describe("categoryService.getById", () => {
  it.todo("GET /categories/:id");
});

describe("categoryService.create", () => {
  it.todo("POST /categories");
});

describe("categoryService.update", () => {
  it.todo("PATCH /categories/:id");
});

describe("categoryService.remove", () => {
  it.todo("DELETE /categories/:id");
});
