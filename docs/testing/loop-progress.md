# Progreso — loop nocturno de unit testing

Generado por `/loop` el 2026-09-11. Se actualiza en cada iteración para que el
loop pueda retomar si la sesión se recorta o el contexto se resume.

## Política de diseño (definida por Opus 5, verificada empíricamente)

**Hecho técnico duro:** todo archivo con `import "server-only"` (17 archivos:
`lib/{audit,auth,permissions,stripe,stripe-customer}.ts`, `server/checkout/*`,
`server/repositories/*`) **no se puede importar** bajo `tsx --test` — lanza en
el import, no en el assert. No hay flag de runner que resuelva esto y también
importe `@clerk/nextjs`/`lucide-react` sin romper. No hay mocking posible ni
permitido (regla `/test-unit`: "si hacen falta piezas falsas, el problema es
el diseño: dilo y para").

**Clasificación mecánica (parar en el primer NO):**
1. ¿`server-only` en el archivo o algo que importa? → IMPURO, no testear.
2. ¿Importa `axios`, `@clerk/*`, `stripe`, `drizzle-orm`, `@/server/db`,
   `@/server/repositories/*`? → IMPURO, no testear.
3. ¿Toca `window`/`sessionStorage`/`document`/`process.env`? → MIXTO: testear
   la rama que Node sí ejecuta, documentar la otra en un comentario.
4. Resto → PURO, testear de verdad.

**Qué hacer con lo impuro:** dejar el `it.todo` (nunca `it.skip`, nunca cuerpo
vacío ejecutable) con UN comentario de bloqueo por archivo explicando qué lo
bloquea y cuál sería el desbloqueo (fuera de alcance). Prohibido: `t.mock.*`,
`mock.module`, objetos `db`/axios falsos, `globalThis.window = {}`.

**Casos grises:** funciones de reloj (`todayInStore`, etc.) sí se testean
sobre invariantes de forma, nunca congelando el tiempo. `process.env` no es
"pieza falsa" (es entorno del proceso, no un colaborador de dominio) pero hoy
no aplica porque el único caso (`stripe.ts`) está bloqueado por `server-only`.
Solo se testea lo exportado — nunca helpers privados no exportados.

**Rendimiento esperado:** ~40 de 153 funciones con tests reales; ~113 quedan
`it.todo` documentado como bloqueo de diseño. Si el loop termina con
significativamente más de ~45 tests pasando, algo se mockeó — revisar.

**Escalar al humano al final (no ahora, no por función):**
1. `toOrderSummary` (`server/checkout/order-summary.ts`) es 100% pura — lo
   único que la bloquea es el `import "server-only"` de su propio archivo.
   Moverla a un módulo sin ese marcador la desbloquearía sin tocar arquitectura.
2. No existe config de runner única que importe a la vez módulos `server-only`
   y de cliente — cubrir `server/` de verdad exigiría un segundo script
   (`--conditions=react-server` sobre un glob separado). Decisión de config,
   del humano.
3. `selectWide` (`src/modules/storefront/lib/landing.ts:107`) no cumple su
   propio contrato documentado: sin ofertas debería devolver "el más caro" pero
   el `reduce` compara `discountPercent ?? 0 > 0 ?? 0` (siempre falso sin
   ofertas) y devuelve `products[0]`, no el más caro. En producción hoy da el
   mismo resultado visual porque `landing-bento.tsx` ya ordena por
   `createdAt desc`, pero es casualidad, no el contrato. Decidir: ¿se corrige
   `selectWide` (comparar `priceCents` como hace `selectSpotlight`) o se
   corrige la documentación? Queda 1 `it.todo` sin cubrir en
   `landing.test.ts` hasta esa decisión.
4. `setQty(id, 0.5)` en `cart-store.ts` pasa el filtro `qty <= 0` (0.5 es
   positivo) pero `Math.trunc` lo deja en 0 después: la línea sobrevive con
   cantidad 0 en vez de borrarse (importe sigue correcto, pero fila fantasma
   en el drawer). Hoy inalcanzable desde la UI (steppers mandan enteros).
   Arreglo si se quiere cerrar: truncar antes de comparar contra 0.
5. `formatDayLabel` (`orders/lib/date-range.ts:94`) documenta en su JSDoc
   `"9 de septiembre de 2026"`, pero el formateador es `es-PE` y ese locale
   imprime `"9 de setiembre de 2026"` (variante peruana; el mismo ejemplo
   desactualizado está en `unit-testable-functions.md`). El código es correcto
   para la tienda: lo que está mal es el ejemplo del comentario. Decidir si se
   corrige el texto. Los tests fijan la salida real (`setiembre`).
6. `lastDaysRange(0)` devuelve un rango invertido (`from` un día después de
   `to`) porque el `(days - 1)` no tiene guarda para 0 o negativos.
   `isRangeValid` lo rechaza aguas abajo y hoy el único llamador es el CTA con
   `HISTORY_LOOKBACK_DAYS`, así que es inalcanzable. Si el parámetro se vuelve
   dinámico hace falta la guarda. Documentado en un test, fuente sin tocar.
7. `brandLabel` (`payment-methods/lib/card-display.ts:24`) busca la marca en un
   objeto literal, así que las claves heredadas de `Object.prototype` ganan al
   fallback: `brandLabel("constructor")` y `brandLabel("toString")` devuelven
   **una función**, no un `string`, pese a la firma `(brand: string) => string`.
   Hoy inalcanzable —`brand` viene del conjunto cerrado de `card.brand` de
   Stripe, nunca de texto libre—, pero es tipado falso. Arreglo de una línea si
   se quiere cerrar: `Object.create(null)` en `BRAND_LABELS` o
   `Object.hasOwn(BRAND_LABELS, brand)` antes del lookup. Documentado en un
   test que fija el comportamiento real, fuente sin tocar.
8. `setup-return.ts` queda con la rama de navegador sin cubrir (leer/escribir
   `sessionStorage`, el guard de `parse` contra JSON manipulado y el `emit()` a
   los suscriptores): `tsx --test` corre sin DOM y fabricar un `window` falso
   está prohibido. Desbloqueo, si se quiere cobertura real: un segundo script
   de test con runner DOM (jsdom/happy-dom) sobre un glob aparte. Decisión de
   config, del humano — es el mismo problema de fondo que el punto 2.
9. `isUniqueViolation` (`lib/api-error.ts:74`) solo se protege de la
   autorreferencia inmediata (`cause !== error`). Con un ciclo mutuo de dos
   errores (`a.cause = b`, `b.cause = a`) la recursión no termina y lanza
   `RangeError: Maximum call stack size exceeded` dentro del `catch` de un
   repositorio, convirtiendo un conflicto de slug en un 500 raro. Hoy
   inalcanzable: las cadenas `cause` de pg/drizzle son lineales. Arreglo si se
   quiere cerrar: llevar un `Set` de visitados o un límite de profundidad.
   Documentado en un test que fija el comportamiento real, fuente sin tocar.
10. `lib/stripe.ts`: cuatro de sus cinco exportaciones (`getStoreCurrency`,
    `getStripeWebhookSecret`, `isResourceMissingError`, `asStripeCardError`) no
    tocan red — solo `process.env` y la forma del error—, y `process.env` no es
    una pieza falsa. Lo único que las bloquea es el `import "server-only"` del
    propio archivo, exactamente el caso del punto 1. Separarlas en un módulo sin
    el marcador (`stripe-env.ts` / `stripe-errors.ts`) las desbloquearía sin
    tocar arquitectura.
11. `formatCents`/`centsToAmountInput` (`lib/format.ts`) asumen centavos enteros
    sin guardar contra un decimal: `formatCents(1299.5)` devuelve
    `"S/ 12,99.5"`. Hoy inalcanzable (`toCents` siempre devuelve entero y la
    columna es `integer`), pero la firma `(cents: number)` no lo impide. Cierre
    posible: `Math.round` a la entrada o un tipo de marca. Documentado en un
    test, fuente sin tocar.
12. Tres núcleos puros están hoy atrapados dentro de módulos impuros y se
    liberarían sin tocar arquitectura, igual que el punto 1. (a) `totalCents`
    (`server/repositories/order.repository.ts:67`) es una suma pura de
    `unitPriceCents * qty` pero no se exporta, así que la política del loop
    —solo se testea lo exportado— la deja fuera. (b) El agrupado en memoria de
    `roleRepository.listWithPermissions` vive dentro del método, después del
    `leftJoin`: extraído como `(rows) => RoleWithPermissions[]` sería testeable
    de inmediato. (c) El armado de line items de `resolve-cart.ts`
    (`buildLineItem`, el total y el mapeo de faltantes a `ConflictError`) es
    puro una vez leídas las filas; separarlo de la relectura dejaría la parte
    verificable fuera del `server-only`. Los tres son decisiones de diseño del
    humano, no trabajo de este loop.
13. El mapeo "404 → `null` vía `validateStatus`" ya está repetido tres veces
    (`publicProductService.getBySlug`, `checkoutService.getBySessionId` y
    `.getById`, más `orderService.getReceiptUrl` con la misma intención). Es el
    umbral de la regla DRY del proyecto —se extrae a la tercera repetición— y
    además convertiría un comportamiento hoy no testeable en una función pura
    con dueño. Candidato claro a extracción.
14. Aviso para no leer mal el tripwire de "Rendimiento esperado": la cifra
    "~45 tests pasando" mezcla unidades. El loop cerró con **515 `it()` reales**
    que cubren **52 de las 153 funciones** del scaffold (102 `it.todo` quedan,
    más 1 nuevo añadido en `landing.test.ts`). Es decir, el número de
    *funciones* cubiertas quedó en la banda prevista (~40-52); lo que creció fue
    la cantidad de casos por función, no la superficie. No se mockeó nada: cero
    `t.mock.*`, cero `mock.module`, cero `db`/axios falsos, cero
    `globalThis.window`. Verificable con un grep sobre `src/**/*.test.ts`.

## Checklist de módulos (orden de ejecución por valor — reales primero)

- [x] `storefront/lib` (4 archivos) — PURO, avanzar a fondo
- [x] `cart/store` (1 archivo) — PURO, avanzar (incluye acciones del store vanilla)
- [x] `orders` (services + lib, 3 archivos) — MIXTO (lib real, services bloqueado)
- [x] `payment-methods` (services + schemas + lib, 4 archivos) — MIXTO
- [x] `lib` (10 archivos) — MIXTO (≈10 reales, 13 bloqueadas)
- [x] `server/repositories` (8 archivos) — IMPURO, solo comentario de bloqueo
- [x] `server/checkout` (2 archivos) — IMPURO, solo comentario de bloqueo
- [x] `products/services` (2 archivos) — IMPURO, solo comentario de bloqueo
- [x] `customers/services` (1 archivo) — IMPURO, solo comentario de bloqueo
- [x] `roles/services` (2 archivos) — IMPURO, solo comentario de bloqueo
- [x] `checkout/services` (1 archivo) — IMPURO, solo comentario de bloqueo
- [x] `categories/services` (2 archivos) — IMPURO, solo comentario de bloqueo
- [x] `audit/services` (2 archivos) — IMPURO, solo comentario de bloqueo

**Checklist completo: 13/13 filas en `[x]`. El loop terminó.**

## Log

- 2026-09-11: scaffold inicial de 42 `.test.ts` ya existía (todos `it.todo`, 153 tests, 0 fail). Arranca el loop para convertirlos en pruebas reales, módulo por módulo.
- 2026-09-11: `storefront/lib` cerrado — 137 `it()` reales (profile 6, search-target 11, landing 71, catalog 49) sobre 21 funciones documentadas; todo importable bajo `tsx --test` sin una sola pieza falsa (`lucide-react` y `zod` no rompen el runner). Queda 1 `it.todo` nuevo: el fallback sin ofertas de `selectWide` devuelve el primer producto, no el más caro que promete su documentación — hallazgo para decisión humana (¿se corrige el código o el comentario?), no se testeó ni se tocó el fuente. `npm test`: 270 tests · 137 pass · 0 fail · 133 todo. `npm run typecheck` y `npm run lint` limpios.
- 2026-09-11: `cart/store` cerrado — 42 `it()` reales: 3 selectores puros (`selectCount` 5, `selectSubtotalCents` 6, `lineTotalCents` 5) y las 4 acciones del store vanilla ejercitadas con `useCartStore.getState()`/`.setState()` (`add` 9, `setQty` 10, `clear` 4, `setOpen` 3), con reset del estado inicial real en `beforeEach` (estado real, no pieza falsa). Cubre tope `CART_MAX_QTY`, `Math.trunc` de cantidades fraccionarias, qty 0/negativa que borra la línea, id desconocido como no-op, inmutabilidad de `items` y que `bumpToken` solo sube en `add`. Hallazgo menor documentado en un test (no bug rojo, no se tocó el fuente): `setQty(id, 0.5)` pasa el filtro `qty <= 0` pero `Math.trunc` lo deja en 0, así que la línea sobrevive con cantidad 0 en vez de borrarse; hoy inalcanzable desde la UI porque los steppers mandan enteros. `npm test`: 309 tests · 179 pass · 0 fail · 130 todo. `npm run typecheck` y `npm run lint` limpios.
- 2026-09-11: `orders` cerrado — 84 `it()` reales en `lib/`: `date-range.test.ts` 68 (toStoreDay 11, todayInStore 4, currentMonthRange 6, lastDaysRange 8, rangeToInstants 11, rangeDays 11, isRangeValid 10, formatDayLabel 6, más 1 sobre `STORE_UTC_OFFSET`) y `group-orders.test.ts` 16. Cubre los bordes de medianoche de la tienda (04:59:59.999Z vs 05:00:00.000Z, medianoche UTC, cambio de mes/año, 29 de febrero, instante pre-epoch), el intervalo semiabierto `[from, to)` de `rangeToInstants`, rango invertido, no parseable y el tope exacto `MAX_RANGE_DAYS`/`MAX_RANGE_DAYS + 1`. Las tres funciones de reloj (`todayInStore`, `currentMonthRange`, `lastDaysRange`) se testean por invariantes contra la ventana de días observada antes/después de la llamada — sin congelar `Date` ni mockear nada. El caso estrella de `groupOrdersByDay` verificado: 23:00Z del 9 y 04:00Z del 10 caen en el mismo grupo `2026-09-09` (día civil de Lima, no UTC), mientras 04:59:59.999Z y 05:00:00.000Z caen en grupos distintos. Bloqueado: `services/order.service.ts` queda con sus 2 `it.todo` y un comentario de bloqueo — smoke-check con import real bajo `tsx` confirmó que el módulo carga y que ambas funciones son passthrough de la instancia `api` de axios; su única lógica propia (`encodeURIComponent` del id y el mapeo 404 → `null` por `validateStatus`) solo se observa a través de una respuesta HTTP, así que exigiría una pieza falsa. Dos hallazgos añadidos a "Escalar al humano" (JSDoc `septiembre` vs `setiembre` de `es-PE`; `lastDaysRange(0)` invertido, hoy inalcanzable); no se tocó ningún fuente. `npm test`: 384 tests · 263 pass · 0 fail · 121 todo. `npm run typecheck` y `npm run lint` limpios.
- 2026-09-11: `payment-methods` cerrado — 76 `it()` reales: `lib/card-display.test.ts` 25 (brandLabel 12, maskedNumber 6, formatExpiry 7), `lib/setup-return.test.ts` 29 (entorno 1, constante 1, getSetupBaseline 3, getServerSetupBaseline 2, rememberSetupBaseline 3, subscribeSetupBaseline 5, isAwaitingCard 14) y `schemas/payment-method.schema.test.ts` 22 (toPaymentMethod 16, paymentMethodIdSchema 6). El bloque de seguridad de `toPaymentMethod` es real, no cosmético: verifica que la proyección Zod recorta `stripePaymentMethodId` (ningún `pm_…` en el JSON), `userId`, timestamps, un `stripeCustomerId` mezclado por descuido y cualquier extra desconocido (`clerkId`, `email`, `fingerprint`), dejando exactamente seis claves. `setup-return` se testeó solo en su rama real de Node: sin DOM, `typeof window === "undefined"` (verificado en un test, no asumido), así que se cubre la rama de servidor de `getSetupBaseline`/`rememberSetupBaseline` —incluido que el `emit()` no llega a los suscriptores— más el ciclo de vida de `subscribeSetupBaseline` y `isAwaitingCard` completa (timeout exclusivo en el borde exacto, conteo igual/menor/mayor al baseline, reloj hacia atrás). La rama de navegador queda documentada como no cubierta en la cabecera del archivo; no se fabricó ningún `window`. Bloqueado: `services/payment-method.service.ts` conserva sus 4 `it.todo` con comentario de bloqueo —smoke-import bajo `tsx` confirma que el módulo carga y que las cuatro funciones son passthrough del singleton `api` de axios—. Hallazgo nuevo en "Escalar al humano" (punto 7): `brandLabel("constructor")` devuelve una función por el lookup sobre un objeto literal; hoy inalcanzable, fuente sin tocar. `npm test`: 451 tests · 339 pass · 0 fail · 112 todo. `npm run typecheck` y `npm run lint` limpios.
- 2026-09-11: `lib` cerrado — 176 `it()` reales en 5 archivos: `api-error.test.ts` 47 (jsonError 8, isUniqueViolation 15, handleApiError 24), `format.test.ts` 56 (toCents 27, AMOUNT_INPUT_PATTERN 5, formatCents 12, centsToAmountInput 12), `image-hosts.test.ts` 26 (isAllowedImageUrl 22 + 4 de los mensajes derivados), `utils.test.ts` 36 (cn 16, slugify 20) y `query-client.test.ts` 11. Los 7 mapeos de status de `handleApiError` quedan fijados (ZodError→400 con `path` unido por puntos incluidos los anidados y el path raíz vacío, 401/403/404, los dos errores de 409, y el 500 que no filtra el mensaje interno ni confía en un impostor con `name = "NotFoundError"`), y `isUniqueViolation` se recorre hasta tres niveles de `cause`, con código numérico en vez de string, cadena que termina en no-objeto y autorreferencia. `toCents` cubre coma vs punto, padding del decimal, el tope exacto de 7 dígitos enteros vs 8, separador colgante, agrupación de miles, notación científica, dígitos no ASCII y la deriva de float que evita (`Math.trunc(19.99 * 100) === 1998`). `isAllowedImageUrl` se testeó como pieza de seguridad: userinfo (`https://images.unsplash.com@evil.com`), subdominio, sufijo/prefijo del host, homoglifo cirílico y punto final del FQDN, todos rechazados. `query-client` se cubre solo en su rama real: se comprueba en un test que no hay `window` y que `isServer` es `true`, se fija que dos llamadas dan instancias distintas con cachés independientes y los defaults (staleTime 60s, sin refetch on focus, retry 1); la rama singleton de navegador queda documentada como NO cubierta en la cabecera del archivo, sin fabricar ningún `window`. Bloqueados por `server-only`, verificado con smoke-import real (los 5 fallan con "This module cannot be imported from a Client Component module"): `audit.ts`, `auth.ts`, `permissions.ts`, `stripe.ts` y `stripe-customer.ts`, cada uno con su comentario de bloqueo y sus `it.todo` intactos (13 funciones). Tres hallazgos nuevos en "Escalar al humano" (9: ciclo mutuo de `cause` revienta la pila en `isUniqueViolation`; 10: cuatro helpers puros de `stripe.ts` bloqueados solo por el marcador del archivo; 11: `formatCents` con centavos fraccionarios); ningún fuente tocado. `npm test`: 617 tests · 515 pass · 0 fail · 102 todo. `npm run typecheck` y `npm run lint` limpios.
- 2026-09-11: **loop cerrado**. Última tanda: los 8 módulos 100% impuros restantes (20 archivos `.test.ts`) quedan documentados con un comentario de bloqueo en la cabecera, sin un solo `it()` real y con sus `it.todo` intactos —nunca `it.skip`, nunca cuerpo vacío—. Es una decisión de política, no falta de esfuerzo: la regla del loop prohíbe piezas falsas, y estos 20 archivos no tienen ninguna costura por la que entrar sin fabricarlas. Antes de escribir cada comentario se corrió un smoke-check con import real bajo `tsx`, y los 20 confirmaron la clasificación previa sin una sola excepción: los 10 módulos de `server/` (8 repositorios + `order-summary.ts` + `resolve-cart.ts`) fallan en el import con "This module cannot be imported from a Client Component module", y los 10 services cargan limpio pero son passthrough del singleton `api` de `@/lib/axios` —su única lógica propia es armar `params`/URL, `encodeURIComponent`, desenvolver `data`/`data.data` y el mapeo de status vía `validateStatus`, todo observable solo a través de una respuesta HTTP—. Ningún archivo resultó tener lógica propia no documentada que mereciera rescatarse. Los comentarios no son genéricos: cada uno nombra qué se perdería (atomicidad de `createPending`, idempotencia de `markPaid` y del upsert de Clerk, el `setStripeCustomerId` que solo escribe sobre NULL, el criterio público activo-y-categoría-activa con el descuento calculado en SQL, la cadena users→user_roles→role_permissions de `findCodesByClerkId`) y por qué un doble de Drizzle no lo probaría: esas invariantes son de la base, así que piden pruebas de **integración** contra una Postgres desechable, no unitarias. Tres hallazgos nuevos en "Escalar al humano" (12: `totalCents`, el agrupado de `listWithPermissions` y el armado puro de `resolve-cart` son núcleos puros atrapados en módulos impuros, liberables sin tocar arquitectura; 13: el mapeo 404→`null` ya va por su tercera repetición y toca extraerlo por DRY; 14: aviso de unidades para que el tripwire de "~45 tests" no se lea como que se mockeó algo). Se reforzó el punto 1 (`toOrderSummary`) en su propio archivo: es la función que garantiza que el cliente no reciba `userId` ni ids de Stripe y hoy ese recorte no tiene red de seguridad automatizada. Cero archivos fuente tocados: el diff son 20 cabeceras de comentario y este documento. `npm test`: 617 tests · 515 pass · 0 fail · 102 todo — idéntico al cierre anterior, como corresponde a un cambio que solo añade comentarios. `npm run typecheck` y `npm run lint` limpios. Checklist final: **13/13**.
