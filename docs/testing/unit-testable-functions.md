# Funciones candidatas a unit testing

**Fecha:** 2026-09-11

**Criterio de inclusión/exclusión:** este inventario solo lista funciones ejecutables de lógica pura, de negocio o de servidor (formateo, validación, cálculo, acceso a datos, servicios HTTP). Quedan fuera componentes React, hooks ligados a UI/TanStack Query/estado de render, providers y cualquier archivo cuyo comportamiento dependa del árbol de componentes. Los objetos `zod` (`z.object(...)`) no se documentan como función salvo que expongan un wrapper ejecutable (`parseX`, `toX`, etc).

---

## lib

Utilidades transversales, sin dependencia de un módulo de negocio concreto.

| Función                     | Archivo                      | Descripción breve                                                                                                                                    |
| --------------------------- | ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `jsonError`                 | `src/lib/api-error.ts`       | Construye una `Response` JSON con `status` y un body `{ message, issues? }`.                                                                         |
| `isUniqueViolation`         | `src/lib/api-error.ts`       | Recorre `error.cause` recursivamente para detectar el código Postgres `23505` (violación de índice único).                                           |
| `handleApiError`            | `src/lib/api-error.ts`       | Mapea una excepción (`ZodError` o los errores de dominio del proyecto) a la `Response` HTTP con el status correspondiente (400/401/403/404/409/500). |
| `logAudit`                  | `src/lib/audit.ts`           | Enmascara campos sensibles de `changes`/`metadata` y delega la inserción en `auditRepository.create` dentro de la transacción recibida.              |
| `requireAuth`               | `src/lib/auth.ts`            | Devuelve el `clerkId` de la sesión activa o lanza `UnauthorizedError`.                                                                               |
| `getCurrentAppUser`         | `src/lib/auth.ts`            | Resuelve la fila local de `users` a partir de la sesión de Clerk; `null` sin sesión o si el webhook aún no sincronizó.                               |
| `toCents`                   | `src/lib/format.ts`          | Convierte un monto decimal escrito por el usuario (`"1299,90"`) a centavos enteros, sin aritmética de punto flotante.                                |
| `formatCents`               | `src/lib/format.ts`          | Centavos → texto de precio (`129990` → `"S/ 1.299,90"`).                                                                                             |
| `centsToAmountInput`        | `src/lib/format.ts`          | Centavos → texto editable en un input (`129990` → `"1299.90"`).                                                                                      |
| `isAllowedImageUrl`         | `src/lib/image-hosts.ts`     | Valida que una URL sea `https` y su host esté en la allowlist de imágenes.                                                                           |
| `getEffectivePermissions`   | `src/lib/permissions.ts`     | Obtiene y filtra contra el catálogo `PERMISSIONS` los códigos de permiso efectivos de un usuario.                                                    |
| `hasPermission`             | `src/lib/permissions.ts`     | Comprueba si un código de permiso está en el set efectivo.                                                                                           |
| `requirePermission`         | `src/lib/permissions.ts`     | Gate de autorización: exige sesión (401) y permiso (403); devuelve el set efectivo.                                                                  |
| `assertCanManageTargetUser` | `src/lib/permissions.ts`     | Bloquea escalada de privilegios: exige `users.assign_privileged_role` para tocar un usuario con rol `admin`/`super_admin` o promoverlo a uno.        |
| `getQueryClient`            | `src/lib/query-client.ts`    | Devuelve una instancia nueva de `QueryClient` en servidor o la instancia singleton en navegador.                                                     |
| `getOrCreateStripeCustomer` | `src/lib/stripe-customer.ts` | Devuelve el `stripeCustomerId` del usuario, creándolo en Stripe la primera vez y resolviendo la carrera de altas concurrentes.                       |
| `getStripe`                 | `src/lib/stripe.ts`          | Inicializa (lazy singleton) y devuelve el cliente de Stripe a partir de `STRIPE_SECRET_KEY`.                                                         |
| `getStoreCurrency`          | `src/lib/stripe.ts`          | Lee `STRIPE_CURRENCY` del entorno y valida que sea un código ISO-4217 de 3 letras; si no, usa `"pen"`.                                               |
| `isResourceMissingError`    | `src/lib/stripe.ts`          | Detecta si un error de Stripe es `resource_missing` (recurso ya eliminado del lado de Stripe).                                                       |
| `asStripeCardError`         | `src/lib/stripe.ts`          | Castea un error a `StripeCardError` si corresponde a un rechazo de tarjeta.                                                                          |
| `getStripeWebhookSecret`    | `src/lib/stripe.ts`          | Lee `STRIPE_WEBHOOK_SECRET` del entorno o lanza si falta.                                                                                            |
| `cn`                        | `src/lib/utils.ts`           | Combina clases de Tailwind resolviendo conflictos (`clsx` + `twMerge`).                                                                              |
| `slugify`                   | `src/lib/utils.ts`           | Normaliza un texto a slug kebab-case (sin acentos, minúsculas, guiones).                                                                             |

**No documentado en `lib`:** `src/lib/axios.ts` (solo configura una instancia de `axios` y su interceptor, sin función exportada aislada) y `src/lib/constants.ts` (solo constantes).

---

## server

### repositories

Funciones de acceso a datos (Drizzle). Testeables con mocks de `Db`/`Tx`; documentadas porque son lógica de servidor, no UI.

#### `audit.repository.ts`

| Función                           | Archivo                                       | Descripción breve                                                                                                         |
| --------------------------------- | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `auditRepository.create`          | `src/server/repositories/audit.repository.ts` | Inserta una fila de `audit_logs` (append-only) dentro de la `db`/`tx` recibida.                                           |
| `auditRepository.list`            | `src/server/repositories/audit.repository.ts` | Lista logs paginados con filtros (`entityType`, `action`, `actorId`, rango de fechas) y el actor resuelto por `leftJoin`. |
| `auditRepository.countBySeverity` | `src/server/repositories/audit.repository.ts` | Cuenta logs agrupados por `severity` desde una fecha dada.                                                                |

#### `category.repository.ts`

| Función                           | Archivo                                          | Descripción breve                                                                          |
| --------------------------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------ |
| `categoryRepository.list`         | `src/server/repositories/category.repository.ts` | Lista categorías vivas, paginadas, con búsqueda y orden dinámico.                          |
| `categoryRepository.listPublic`   | `src/server/repositories/category.repository.ts` | Lista (sin paginar) las categorías vivas y activas, proyección pública.                    |
| `categoryRepository.findById`     | `src/server/repositories/category.repository.ts` | Busca una categoría viva por id.                                                           |
| `categoryRepository.existsBySlug` | `src/server/repositories/category.repository.ts` | Comprueba si un slug ya existe entre las categorías vivas, excluyendo opcionalmente un id. |
| `categoryRepository.create`       | `src/server/repositories/category.repository.ts` | Inserta una categoría, traduciendo la violación de índice único a `SlugConflictError`.     |
| `categoryRepository.update`       | `src/server/repositories/category.repository.ts` | Actualiza una categoría viva por id, con el mismo mapeo de conflicto de slug.              |
| `categoryRepository.softDelete`   | `src/server/repositories/category.repository.ts` | Marca `deletedAt` en vez de borrar físicamente.                                            |

#### `order.repository.ts`

| Función                                            | Archivo                                       | Descripción breve                                                                                                         |
| -------------------------------------------------- | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `orderRepository.createPending`                    | `src/server/repositories/order.repository.ts` | Crea una orden `pending` con sus ítems en una única transacción, calculando `totalCents`.                                 |
| `orderRepository.createPendingForPaymentIntent`    | `src/server/repositories/order.repository.ts` | Igual que `createPending` pero sin `stripeCheckoutSessionId` (camino de tarjeta guardada).                                |
| `orderRepository.findBySessionId`                  | `src/server/repositories/order.repository.ts` | Busca una orden (con sus ítems) por `stripeCheckoutSessionId`.                                                            |
| `orderRepository.findManyByUserInRange`            | `src/server/repositories/order.repository.ts` | Historial de compras del usuario en un rango de instantes, con sus ítems resueltos en batch (sin N+1).                    |
| `orderRepository.findByIdForUser`                  | `src/server/repositories/order.repository.ts` | Busca una orden por id restringida a su dueño.                                                                            |
| `orderRepository.findByIdForUserWithItems`         | `src/server/repositories/order.repository.ts` | Igual que `findByIdForUser`, incluyendo las líneas de la orden.                                                           |
| `orderRepository.markPaid`                         | `src/server/repositories/order.repository.ts` | Marca una orden como `paid` por `stripeCheckoutSessionId`, idempotente (guarda `status <> 'paid'`).                       |
| `orderRepository.markPaidByPaymentIntent`          | `src/server/repositories/order.repository.ts` | Igual que `markPaid` pero localizando la orden por id, para el camino de PaymentIntent.                                   |
| `orderRepository.markPaymentFailedByPaymentIntent` | `src/server/repositories/order.repository.ts` | Marca una orden `pending` como `payment_failed` por id, sin pisar un `paymentIntentId` ya guardado si no llega uno nuevo. |
| `orderRepository.markPaymentFailed`                | `src/server/repositories/order.repository.ts` | Marca una orden `pending` como `payment_failed` por `stripeCheckoutSessionId`.                                            |
| `orderRepository.decrementStock`                   | `src/server/repositories/order.repository.ts` | Descuenta stock por línea dentro de una transacción, devolviendo las líneas cuyo stock no alcanzó (`StockShortage[]`).    |

#### `payment-method.repository.ts`

| Función                                    | Archivo                                                | Descripción breve                                                                                                                  |
| ------------------------------------------ | ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| `paymentMethodRepository.findManyByUser`   | `src/server/repositories/payment-method.repository.ts` | Lista las tarjetas del usuario, más recientes primero.                                                                             |
| `paymentMethodRepository.findByIdForUser`  | `src/server/repositories/payment-method.repository.ts` | Busca una tarjeta por id restringida a su dueño.                                                                                   |
| `paymentMethodRepository.upsertFromStripe` | `src/server/repositories/payment-method.repository.ts` | Alta/actualización idempotente de una tarjeta desde un evento de Stripe; marca la primera tarjeta del usuario como predeterminada. |
| `paymentMethodRepository.setDefault`       | `src/server/repositories/payment-method.repository.ts` | Marca una tarjeta como predeterminada y desmarca la anterior en la misma transacción.                                              |
| `paymentMethodRepository.deleteForUser`    | `src/server/repositories/payment-method.repository.ts` | Borra una tarjeta del usuario y, si era la predeterminada, promueve la más reciente restante.                                      |

#### `permission.repository.ts`

| Función                                   | Archivo                                            | Descripción breve                                                                                     |
| ----------------------------------------- | -------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `permissionRepository.listAll`            | `src/server/repositories/permission.repository.ts` | Lista todos los permisos del catálogo, ordenados por recurso y acción.                                |
| `permissionRepository.findByCodes`        | `src/server/repositories/permission.repository.ts` | Busca permisos por una lista de códigos.                                                              |
| `permissionRepository.findCodesByClerkId` | `src/server/repositories/permission.repository.ts` | Resuelve en una sola consulta los códigos de permiso efectivos de un usuario activo por su `clerkId`. |

#### `product.repository.ts`

| Función                                 | Archivo                                         | Descripción breve                                                                                                                             |
| --------------------------------------- | ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `productRepository.list`                | `src/server/repositories/product.repository.ts` | Lista productos vivos (panel admin), paginados, con búsqueda, filtro por categoría/estado y orden dinámico.                                   |
| `productRepository.listPublic`          | `src/server/repositories/product.repository.ts` | Lista productos públicos (activos, con categoría activa), con filtros de precio/stock/ofertas y orden incluyendo `discount` calculado en SQL. |
| `productRepository.findPublicBySlug`    | `src/server/repositories/product.repository.ts` | Busca la ficha pública de un producto por slug, con el mismo criterio de "público" que el listado.                                            |
| `productRepository.findManyActiveByIds` | `src/server/repositories/product.repository.ts` | Resuelve varias líneas de carrito en una consulta, devolviendo solo los productos públicos encontrados.                                       |
| `productRepository.findById`            | `src/server/repositories/product.repository.ts` | Busca un producto vivo por id (panel admin).                                                                                                  |
| `productRepository.existsBySlug`        | `src/server/repositories/product.repository.ts` | Comprueba si un slug ya existe entre los productos vivos, excluyendo opcionalmente un id.                                                     |
| `productRepository.existsBySku`         | `src/server/repositories/product.repository.ts` | Comprueba si un SKU ya existe entre los productos vivos, excluyendo opcionalmente un id.                                                      |
| `productRepository.create`              | `src/server/repositories/product.repository.ts` | Inserta un producto, traduciendo la violación de índice único a `SlugConflictError`.                                                          |
| `productRepository.update`              | `src/server/repositories/product.repository.ts` | Actualiza un producto vivo por id, con el mismo mapeo de conflicto.                                                                           |
| `productRepository.softDelete`          | `src/server/repositories/product.repository.ts` | Marca `deletedAt` en vez de borrar físicamente.                                                                                               |

#### `role.repository.ts`

| Función                              | Archivo                                      | Descripción breve                                                                      |
| ------------------------------------ | -------------------------------------------- | -------------------------------------------------------------------------------------- |
| `roleRepository.listWithPermissions` | `src/server/repositories/role.repository.ts` | Lista todos los roles con sus permisos agrupados en memoria a partir de un `leftJoin`. |
| `roleRepository.findByUserId`        | `src/server/repositories/role.repository.ts` | Devuelve el (único) rol asignado a un usuario.                                         |
| `roleRepository.findBySlug`          | `src/server/repositories/role.repository.ts` | Busca un rol por su slug estable.                                                      |
| `roleRepository.findById`            | `src/server/repositories/role.repository.ts` | Busca un rol por id.                                                                   |
| `roleRepository.replacePermissions`  | `src/server/repositories/role.repository.ts` | Reemplaza el set completo de permisos de un rol (borra e reinserta).                   |
| `roleRepository.assignToUser`        | `src/server/repositories/role.repository.ts` | Reemplaza el rol asignado a un usuario (borra el anterior y asigna el nuevo).          |

#### `user.repository.ts`

| Función                               | Archivo                                      | Descripción breve                                                                                       |
| ------------------------------------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `userRepository.upsertByClerkId`      | `src/server/repositories/user.repository.ts` | Alta/actualización idempotente del espejo local de `users` a partir de un webhook de Clerk.             |
| `userRepository.findByClerkId`        | `src/server/repositories/user.repository.ts` | Busca un usuario por `clerkId`.                                                                         |
| `userRepository.findByIdWithRole`     | `src/server/repositories/user.repository.ts` | Busca un usuario por id junto con su rol.                                                               |
| `userRepository.list`                 | `src/server/repositories/user.repository.ts` | Lista usuarios paginados con filtros (búsqueda, estado, rol) y su rol resuelto por `leftJoin`.          |
| `userRepository.countByRole`          | `src/server/repositories/user.repository.ts` | Cuenta usuarios agrupados por rol.                                                                      |
| `userRepository.countByStatus`        | `src/server/repositories/user.repository.ts` | Cuenta usuarios activos vs. inactivos.                                                                  |
| `userRepository.findStripeCustomerId` | `src/server/repositories/user.repository.ts` | Lee el `stripeCustomerId` de un usuario.                                                                |
| `userRepository.setStripeCustomerId`  | `src/server/repositories/user.repository.ts` | Guarda el `stripeCustomerId` solo si la columna estaba en `NULL` (evita pisar una carrera concurrente). |
| `userRepository.setActive`            | `src/server/repositories/user.repository.ts` | Activa/desactiva un usuario.                                                                            |

### checkout

| Función                 | Archivo                                | Descripción breve                                                                                                                                                 |
| ----------------------- | -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `toOrderSummary`        | `src/server/checkout/order-summary.ts` | Proyecta una orden con ítems a la forma `OrderSummary` que ve el cliente (sin `userId` ni ids de Stripe).                                                         |
| `resolveCartForPayment` | `src/server/checkout/resolve-cart.ts`  | Releé de BD precio/stock/disponibilidad de cada línea del carrito y arma los line items de Stripe y del pedido; lanza `ConflictError` si algo no está disponible. |

**No documentado en `server`:** `src/server/db/seed.ts` (script de arranque; `createSeedClient` y `resolveGrantedCodes` son funciones internas no exportadas, no invocables desde un test externo) y `src/server/db/schema/*` (solo definiciones de tabla, sin funciones).

---

## products

### services

| Función                          | Archivo                                                   | Descripción breve                                                            |
| -------------------------------- | --------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `publicProductService.list`      | `src/modules/products/services/public-product.service.ts` | `GET /storefront/products` con los parámetros de query dados.                |
| `publicProductService.getBySlug` | `src/modules/products/services/public-product.service.ts` | `GET` de la ficha pública por slug; devuelve `null` en 404 en vez de lanzar. |
| `productService.list`            | `src/modules/products/services/product.service.ts`        | `GET /products` (panel admin) con los parámetros de query dados.             |
| `productService.getById`         | `src/modules/products/services/product.service.ts`        | `GET /products/:id`.                                                         |
| `productService.create`          | `src/modules/products/services/product.service.ts`        | `POST /products`.                                                            |
| `productService.update`          | `src/modules/products/services/product.service.ts`        | `PATCH /products/:id`.                                                       |
| `productService.remove`          | `src/modules/products/services/product.service.ts`        | `DELETE /products/:id`.                                                      |

**Schemas:** `product.schema.ts` y `public-product.schema.ts` solo exportan objetos `zod` (validación de query/formulario), sin funciones wrapper ejecutables — no se listan.

---

## customers

### services

| Función                    | Archivo                                          | Descripción breve                                         |
| -------------------------- | ------------------------------------------------ | --------------------------------------------------------- |
| `userService.list`         | `src/modules/customers/services/user.service.ts` | `GET /admin/customers` con los parámetros de query dados. |
| `userService.invite`       | `src/modules/customers/services/user.service.ts` | `POST /admin/customers`: crea una invitación de Clerk.    |
| `userService.updateRole`   | `src/modules/customers/services/user.service.ts` | `PATCH /admin/customers/:id/role`.                        |
| `userService.updateStatus` | `src/modules/customers/services/user.service.ts` | `PATCH /admin/customers/:id/status`.                      |

**Schemas:** `user.schema.ts` solo exporta objetos `zod`, sin función wrapper.

---

## roles

### services

| Función                         | Archivo                                            | Descripción breve                                               |
| ------------------------------- | -------------------------------------------------- | --------------------------------------------------------------- |
| `permissionService.list`        | `src/modules/roles/services/permission.service.ts` | `GET /admin/permissions`.                                       |
| `roleService.list`              | `src/modules/roles/services/role.service.ts`       | `GET /admin/roles`, incluyendo permisos por rol.                |
| `roleService.updatePermissions` | `src/modules/roles/services/role.service.ts`       | `PATCH /admin/roles/:id/permissions` (reemplazo total del set). |

**Schemas:** `role.schema.ts` solo exporta objetos `zod`, sin función wrapper.

---

## checkout

### services

| Función                              | Archivo                                             | Descripción breve                                                               |
| ------------------------------------ | --------------------------------------------------- | ------------------------------------------------------------------------------- |
| `checkoutService.createSession`      | `src/modules/checkout/services/checkout.service.ts` | `POST /checkout/session`; devuelve la URL hosteada de Stripe Checkout.          |
| `checkoutService.payWithSavedMethod` | `src/modules/checkout/services/checkout.service.ts` | `POST /checkout/pay` con una tarjeta guardada; devuelve el resultado del cobro. |
| `checkoutService.getBySessionId`     | `src/modules/checkout/services/checkout.service.ts` | `GET /orders/by-session/:sessionId`; devuelve `null` en 404.                    |
| `checkoutService.getById`            | `src/modules/checkout/services/checkout.service.ts` | `GET /orders/:orderId`; devuelve `null` en 404.                                 |

**Schemas:** `checkout.schema.ts` solo exporta objetos `zod` (incluyendo un `.refine` sobre productos repetidos), sin función wrapper.

---

## orders

### services

| Función                      | Archivo                                        | Descripción breve                                                                       |
| ---------------------------- | ---------------------------------------------- | --------------------------------------------------------------------------------------- |
| `orderService.listGrouped`   | `src/modules/orders/services/order.service.ts` | `GET /orders` con un rango de fechas; la API ya devuelve el historial agrupado por día. |
| `orderService.getReceiptUrl` | `src/modules/orders/services/order.service.ts` | `GET /orders/:orderId/receipt`; devuelve `null` en 404.                                 |

### lib

| Función             | Archivo                                  | Descripción breve                                                                                                    |
| ------------------- | ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `toStoreDay`        | `src/modules/orders/lib/date-range.ts`   | Convierte un instante a su día civil en la zona de la tienda (UTC-05:00), como `"YYYY-MM-DD"`.                       |
| `todayInStore`      | `src/modules/orders/lib/date-range.ts`   | Día de hoy en el calendario de la tienda.                                                                            |
| `currentMonthRange` | `src/modules/orders/lib/date-range.ts`   | Rango del día 1 del mes en curso a hoy.                                                                              |
| `lastDaysRange`     | `src/modules/orders/lib/date-range.ts`   | Rango de los últimos N días (incluyendo hoy).                                                                        |
| `rangeToInstants`   | `src/modules/orders/lib/date-range.ts`   | Convierte un rango de días civiles a un intervalo semiabierto de instantes `[from, to)`.                             |
| `rangeDays`         | `src/modules/orders/lib/date-range.ts`   | Cantidad de días que abarca un rango, contando ambos extremos.                                                       |
| `isRangeValid`      | `src/modules/orders/lib/date-range.ts`   | Valida que un rango no esté vacío, no esté invertido y no supere `MAX_RANGE_DAYS`.                                   |
| `formatDayLabel`    | `src/modules/orders/lib/date-range.ts`   | Día civil → texto largo en español (`"9 de septiembre de 2026"`).                                                    |
| `groupOrdersByDay`  | `src/modules/orders/lib/group-orders.ts` | Agrupa órdenes por día civil de la tienda, sumando el total de cada grupo y ordenando de más reciente a más antiguo. |

**Schemas:** `order-history.schema.ts` solo exporta objetos `zod` (usa `rangeDays` importado de `lib/date-range.ts` dentro de un `.refine`, pero no define función propia).

---

## categories

### services

| Función                      | Archivo                                                      | Descripción breve                                                  |
| ---------------------------- | ------------------------------------------------------------ | ------------------------------------------------------------------ |
| `categoryService.list`       | `src/modules/categories/services/category.service.ts`        | `GET /categories` (panel admin) con los parámetros de query dados. |
| `categoryService.getById`    | `src/modules/categories/services/category.service.ts`        | `GET /categories/:id`.                                             |
| `categoryService.create`     | `src/modules/categories/services/category.service.ts`        | `POST /categories`.                                                |
| `categoryService.update`     | `src/modules/categories/services/category.service.ts`        | `PATCH /categories/:id`.                                           |
| `categoryService.remove`     | `src/modules/categories/services/category.service.ts`        | `DELETE /categories/:id`.                                          |
| `publicCategoryService.list` | `src/modules/categories/services/public-category.service.ts` | `GET /storefront/categories`.                                      |

**Schemas:** `category.schema.ts` y `public-category.schema.ts` solo exportan objetos `zod`, sin función wrapper.

---

## audit

### services

| Función                  | Archivo                                           | Descripción breve                                                         |
| ------------------------ | ------------------------------------------------- | ------------------------------------------------------------------------- |
| `auditLogService.list`   | `src/modules/audit/services/audit-log.service.ts` | `GET /admin/audit-logs` (solo lectura) con los parámetros de query dados. |
| `metricsService.summary` | `src/modules/audit/services/metrics.service.ts`   | `GET /admin/metrics`.                                                     |

**Schemas:** `audit-log.schema.ts` solo exporta un objeto `zod` con `.refine` de rango de fechas, sin función wrapper.

---

## payment-methods

### services

| Función                                   | Archivo                                                          | Descripción breve                                                          |
| ----------------------------------------- | ---------------------------------------------------------------- | -------------------------------------------------------------------------- |
| `paymentMethodService.list`               | `src/modules/payment-methods/services/payment-method.service.ts` | `GET /payment-methods`.                                                    |
| `paymentMethodService.createSetupSession` | `src/modules/payment-methods/services/payment-method.service.ts` | `POST /payment-methods/setup-session`; devuelve la URL hosteada de Stripe. |
| `paymentMethodService.setDefault`         | `src/modules/payment-methods/services/payment-method.service.ts` | `PATCH /payment-methods/:id/default`.                                      |
| `paymentMethodService.remove`             | `src/modules/payment-methods/services/payment-method.service.ts` | `DELETE /payment-methods/:id`.                                             |

### schemas

| Función           | Archivo                                                        | Descripción breve                                                                                                                                     |
| ----------------- | -------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `toPaymentMethod` | `src/modules/payment-methods/schemas/payment-method.schema.ts` | Proyecta una fila de `payment_methods` a la forma pública `PaymentMethod`, descartando por Zod cualquier campo sensible (`pm_…`, `stripeCustomerId`). |

### lib

| Función                  | Archivo                                           | Descripción breve                                                                                                                                   |
| ------------------------ | ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `getSetupBaseline`       | `src/modules/payment-methods/lib/setup-return.ts` | Lee y cachea de `sessionStorage` el conteo de tarjetas al momento de ir a Stripe.                                                                   |
| `getServerSetupBaseline` | `src/modules/payment-methods/lib/setup-return.ts` | Siempre devuelve `null` en servidor (no hay rastro de una ida a Stripe).                                                                            |
| `rememberSetupBaseline`  | `src/modules/payment-methods/lib/setup-return.ts` | Guarda en `sessionStorage` el conteo de tarjetas antes de ir a Stripe y notifica a los listeners.                                                   |
| `subscribeSetupBaseline` | `src/modules/payment-methods/lib/setup-return.ts` | Suscribe/desuscribe un listener al cambio del baseline (para `useSyncExternalStore`).                                                               |
| `isAwaitingCard`         | `src/modules/payment-methods/lib/setup-return.ts` | Determina si aún tiene sentido esperar al webhook (mismo conteo o menor que el baseline, dentro del timeout), función pura sobre un `now` recibido. |
| `brandLabel`             | `src/modules/payment-methods/lib/card-display.ts` | Nombre de marca de tarjeta para mostrar (`"visa"` → `"Visa"`), con fallback capitalizado.                                                           |
| `maskedNumber`           | `src/modules/payment-methods/lib/card-display.ts` | Formatea los últimos 4 dígitos como `"•••• 4242"`.                                                                                                  |
| `formatExpiry`           | `src/modules/payment-methods/lib/card-display.ts` | Formatea mes/año de vencimiento como `"MM/AAAA"`.                                                                                                   |

---

## storefront

Solo `lib/`: los componentes del módulo quedan fuera del criterio de este documento.

### lib

| Función                | Archivo                                       | Descripción breve                                                                                                                        |
| ---------------------- | --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `profileTabHref`       | `src/modules/storefront/lib/profile.ts`       | Construye el href de una sección de `/profile` (sin query string para la pestaña por defecto).                                           |
| `resolveSearchHref`    | `src/modules/storefront/lib/search-target.ts` | Decide si un click del buscador va a la ficha del producto o al catálogo filtrado, según coincidencia de texto o cantidad de resultados. |
| `isOffer`              | `src/modules/storefront/lib/landing.ts`       | Determina si un producto tiene precio de comparación mayor al vigente (está en oferta).                                                  |
| `isSoldOut`            | `src/modules/storefront/lib/landing.ts`       | Determina si el stock de un producto es 0 o menor.                                                                                       |
| `discountPercent`      | `src/modules/storefront/lib/landing.ts`       | Calcula el porcentaje de descuento redondeado con aritmética entera (sin pasar por decimales).                                           |
| `discountLabel`        | `src/modules/storefront/lib/landing.ts`       | Texto de descuento (`"-20 %"`) o `null` si no aplica.                                                                                    |
| `stockNote`            | `src/modules/storefront/lib/landing.ts`       | Texto de stock (`"Agotado"` o `"N en stock"`).                                                                                           |
| `productSpec`          | `src/modules/storefront/lib/landing.ts`       | Línea corta bajo el nombre del producto: su descripción o, si no hay, el nombre de su categoría.                                         |
| `selectOffers`         | `src/modules/storefront/lib/landing.ts`       | Filtra los productos en oferta de una lista.                                                                                             |
| `selectHeroSlides`     | `src/modules/storefront/lib/landing.ts`       | Selecciona los slides del hero: las ofertas, o los primeros 4 productos si no hay ninguna.                                               |
| `selectSpotlight`      | `src/modules/storefront/lib/landing.ts`       | Selecciona el producto sin descuento más caro (o el más caro a secas si todo está en oferta).                                            |
| `selectWide`           | `src/modules/storefront/lib/landing.ts`       | Selecciona la oferta con mayor descuento (o el más caro si no hay ofertas).                                                              |
| `selectThumbs`         | `src/modules/storefront/lib/landing.ts`       | Selecciona hasta 3 productos restantes, excluyendo los ya usados en otras secciones.                                                     |
| `formatCountdown`      | `src/modules/storefront/lib/landing.ts`       | Segundos → `"HH:MM:SS"`, saturando en cero si es negativo.                                                                               |
| `secondsUntil`         | `src/modules/storefront/lib/landing.ts`       | Segundos restantes hasta un deadline, dados ambos instantes en ms.                                                                       |
| `productHref`          | `src/modules/storefront/lib/catalog.ts`       | Construye la ruta de la ficha pública de un producto a partir de su slug.                                                                |
| `parseCatalogParams`   | `src/modules/storefront/lib/catalog.ts`       | Convierte `URLSearchParams` al estado tipado del catálogo (`CatalogState`), con defaults ante valores inválidos.                         |
| `toCatalogQueryString` | `src/modules/storefront/lib/catalog.ts`       | Convierte el estado del catálogo a query string, omitiendo los valores por defecto.                                                      |
| `toCatalogHref`        | `src/modules/storefront/lib/catalog.ts`       | Construye la URL completa del catálogo a partir de su estado.                                                                            |
| `toCatalogQuery`       | `src/modules/storefront/lib/catalog.ts`       | Convierte el estado del catálogo a los parámetros de `GET /storefront/products`.                                                         |
| `hasActiveFilters`     | `src/modules/storefront/lib/catalog.ts`       | Determina si el estado del catálogo tiene algún filtro activo (orden y página no cuentan).                                               |

**No documentado en `storefront`:** `lib/styles.ts` solo exporta constantes de clases CSS, sin funciones.

---

## cart

### store

Los selectores viven fuera del hook `useCartStore` y son funciones puras sobre el estado, testeables sin renderizar nada.

| Función               | Archivo                                | Descripción breve                                                   |
| --------------------- | -------------------------------------- | ------------------------------------------------------------------- |
| `selectCount`         | `src/modules/cart/store/cart-store.ts` | Suma las cantidades de todas las líneas del carrito.                |
| `selectSubtotalCents` | `src/modules/cart/store/cart-store.ts` | Suma `priceCents * qty` de todas las líneas (subtotal en centavos). |
| `lineTotalCents`      | `src/modules/cart/store/cart-store.ts` | Total de una línea individual (`priceCents * qty`).                 |

**Nota:** `clampQty` es una función pura equivalente (topa la cantidad a `CART_MAX_QTY`) pero no está exportada, así que no es importable desde un test externo sin antes exportarla. Las acciones `add`/`setQty`/`clear`/`setOpen` son mutadores del store de Zustand: se ejercitan mejor con `useCartStore.getState()` que como unidades aisladas, y no se listan aquí.

`src/modules/products/store/` está vacío (solo `.gitkeep`), no hay nada que documentar.

---

## Módulos sin funciones documentables

- **dashboard**: todos sus subdirectorios están vacíos (solo `.gitkeep`).
- **types** (`src/types/api.ts`): solo declara el tipo `PageMeta`, sin funciones.
