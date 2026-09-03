# MODELO DE DATOS — detalle

Anexo de [SETUP.md](SETUP.md). Columnas, relaciones y reglas duras de RBAC y
auditoría. **Léelo solo si tu tarea toca esas tablas.**

---

## Tablas

El detalle exacto de cada tabla lo define su spec. Precios en **enteros
(centavos)**. Nunca `float`.

### 1. Identidad y acceso (RBAC)

| Tabla | Propósito | Relaciones |
|---|---|---|
| `users` | espejo local de Clerk: `clerk_id` (único), email, nombre, `is_active` | N—N `roles`, 1—N `orders`, 1—N `audit_logs` |
| `roles` | rol nombrado: `slug` (`customer`, `admin`, `manager`, `support`), nombre, descripción, `is_system` | N—N `users`, N—N `permissions` |
| `permissions` | permiso atómico: `code` único `<recurso>.<acción>` (`products.create`, `orders.update_status`), `resource`, `action`, descripción | N—N `roles` |
| `role_permissions` | pivote rol ↔ permiso. PK compuesta (`role_id`, `permission_id`) | N—1 `roles`, N—1 `permissions` |
| `user_roles` | pivote usuario ↔ rol. PK compuesta (`user_id`, `role_id`), `assigned_by`, `assigned_at` | N—1 `users`, N—1 `roles` |

**Cómo convive con Clerk**

- Clerk es la fuente de verdad de la **autenticación** (sesión, credenciales, MFA).
- Postgres es la fuente de verdad de la **autorización** (roles y permisos del dominio).
- `users` se sincroniza desde Clerk vía webhook (`user.created`, `user.updated`, `user.deleted`).
- El set de permisos efectivo se resuelve en servidor: `clerk_id → users → user_roles → role_permissions → permissions`.
- Cachear el set de permisos en `publicMetadata` de Clerk es opcional y **derivado**; ante discrepancia, gana Postgres.

**Reglas duras**

1. La verificación se hace siempre por `permission.code`, nunca por nombre de rol
   quemado en el código (`if (role === 'admin')` es un hallazgo bloqueante).
2. Los roles de sistema (`is_system = true`) no se borran ni se renombran desde la UI.
3. Un usuario sin filas en `user_roles` es `customer` por defecto. Ese default vive
   en un solo lugar del servidor, no repartido por la app.
4. `permissions` es una tabla semilla (`db:seed`), no editable desde el panel. Los
   permisos nacen del código; los roles se componen desde la UI.

### 2. Auditoría y logs

| Tabla | Propósito | Relaciones |
|---|---|---|
| `audit_logs` | traza inmutable de toda mutación relevante | N—1 `users` (`actor_id`, nullable) |

Columnas:

| Columna | Tipo | Nota |
|---|---|---|
| `id` | uuid PK | |
| `actor_id` | fk `users.id` nullable | null = acción del sistema, cron o webhook |
| `action` | text | `product.created`, `order.status_changed`, `role.permission_granted`, `auth.login_failed` |
| `entity_type` | text | `product`, `order`, `user`, `role` |
| `entity_id` | text nullable | id del registro afectado |
| `changes` | jsonb nullable | `{ before, after }` — solo los campos que cambiaron |
| `metadata` | jsonb nullable | contexto extra (ruta, motivo, id de request) |
| `ip_address` | inet nullable | |
| `user_agent` | text nullable | |
| `severity` | enum | `info` \| `warning` \| `error` |
| `created_at` | timestamptz | default `now()` |

Índices: `(entity_type, entity_id)`, `(actor_id, created_at desc)`, `(action)`,
`(created_at desc)`.

**Reglas duras**

1. `audit_logs` es **append-only**. Sin `UPDATE`, sin `DELETE` desde la aplicación.
   El único borrado permitido es la purga por retención (job, no request de usuario).
2. Se escribe en la **misma transacción** que la mutación auditada. Si la mutación
   revierte, el log también.
3. Nunca se guarda PII sensible ni secretos en `changes` o `metadata`: sin
   contraseñas, tokens, claves de API ni datos de tarjeta. Los campos sensibles se
   enmascaran antes de serializar.
4. Un fallo al escribir el log **no** debe romper la operación de negocio salvo que
   la acción sea de seguridad (cambio de rol o permiso), donde sí es transaccional
   y bloqueante.
5. Retención sugerida: 180 días para `info`, indefinida para acciones de seguridad.

> `audit_logs` cubre también los eventos de autenticación y de seguridad mediante
> el prefijo de `action` (`auth.*`, `role.*`). Se separa en una tabla propia solo
> si el volumen o los patrones de consulta divergen de verdad.

### 3. Catálogo y ventas

| Tabla | Propósito | Relaciones |
|---|---|---|
| `categories` | taxonomía de productos | 1—N `products` |
| `products` | SKU, nombre, slug, precio, stock, specs | N—1 `categories` |
| `product_images` | galería | N—1 `products` |
| `carts` / `cart_items` | carrito persistido | N—1 `users`, `products` |
| `orders` | cabecera: total, estado, dirección | N—1 `users` |
| `order_items` | detalle con precio congelado | N—1 `orders`, `products` |

---
