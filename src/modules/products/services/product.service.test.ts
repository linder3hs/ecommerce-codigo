// Pruebas unitarias de src/modules/products/services/product.service.ts — bloqueadas.
//
// BLOQUEO: el módulo importa la instancia `api` de `@/lib/axios`, un singleton
// creado en tiempo de import y sin punto de inyección de transporte. Smoke-check
// con un import real bajo `tsx`: el módulo carga sin romper, así que lo que
// falta es la costura, no el runner. Los cinco métodos son CRUD passthrough
// —concatenar el id a la URL, pasar `params` o el body y devolver `data`— sin
// una sola decisión propia: no hay nada que afirmar que no sea "se llamó a
// axios", y verificar eso exigiría una pieza falsa (adapter sustituido o
// servidor de mentira), prohibido por la política del loop. Un test así fijaría
// la implementación, no el comportamiento.
// DESBLOQUEO (fuera de alcance): recibir el cliente HTTP como parámetro/factory
// en vez de importarlo. Aun con la costura puesta, el valor de testear este
// archivo sería bajo: la lógica real de productos está en el Route Handler, en
// los esquemas Zod y en el repositorio, no aquí.
import { describe, it } from "node:test";

describe("productService.list", () => {
  it.todo("GET /products for the admin panel with the given query parameters");
});

describe("productService.getById", () => {
  it.todo("GET /products/:id");
});

describe("productService.create", () => {
  it.todo("POST /products");
});

describe("productService.update", () => {
  it.todo("PATCH /products/:id");
});

describe("productService.remove", () => {
  it.todo("DELETE /products/:id");
});
