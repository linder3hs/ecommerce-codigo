// Pruebas unitarias de src/modules/dashboard/services/dashboard.service.ts — bloqueadas.
//
// BLOQUEO: el módulo importa la instancia `api` de `@/lib/axios`, un singleton
// creado en tiempo de import y sin punto de inyección de transporte. Smoke-check
// con un import real bajo `tsx`: el módulo carga y expone `dashboardService`
// —`{ metrics }`—, así que lo que falta es la costura, no el runner.
//
// A diferencia de los otros services del proyecto, este sí tiene lógica propia:
// no es passthrough, parsea la respuesta con `dashboardMetricsSchema`. Pero esa
// lógica es una línea (`parse(data)`) y el comportamiento del schema —qué acepta,
// qué rechaza y qué claves recorta, incluida la respuesta completa que arma el
// handler— ya está cubierto caso por caso en `../schemas/dashboard.schema.test.ts`
// (T5). Lo único que quedaría por afirmar acá es el cableado —"el GET va a
// `/admin/dashboard` y su `data` entra al schema"—, y eso solo se observa a
// través de una respuesta HTTP: exigiría una pieza falsa (adapter de axios
// sustituido o servidor de mentira), prohibido por la política del loop
// (`docs/testing/loop-progress.md`).
// DESBLOQUEO (fuera de alcance): recibir el cliente HTTP como parámetro/factory
// en vez de importarlo.
import { describe, it } from "node:test";

describe("dashboardService.metrics", () => {
  it.todo(
    "GET /admin/dashboard, parsing the response with dashboardMetricsSchema so a contract breach surfaces as an error instead of half-drawn widgets",
  );
});
