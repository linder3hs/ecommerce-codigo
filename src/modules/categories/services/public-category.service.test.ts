// Pruebas unitarias de src/modules/categories/services/public-category.service.ts — bloqueadas.
//
// BLOQUEO: el módulo importa la instancia `api` de `@/lib/axios`, un singleton
// creado en tiempo de import y sin punto de inyección de transporte. Smoke-check
// con un import real bajo `tsx`: el módulo carga sin romper, así que lo que
// falta es la costura, no el runner. El archivo entero es un método: un GET a
// una constante que devuelve `data`. No hay parámetros, ni ids, ni mapeo de
// status: nada que afirmar salvo "se llamó a axios", lo que exige una pieza
// falsa y está prohibido por la política del loop.
// DESBLOQUEO (fuera de alcance): recibir el cliente HTTP como parámetro/factory.
// Aun con la costura, este archivo no tendría nada propio que verificar.
import { describe, it } from "node:test";

describe("publicCategoryService.list", () => {
  it.todo("GET /storefront/categories");
});
