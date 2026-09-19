// `import type` es obligatorio: se borra en compilación y ni drizzle-orm ni el
// repositorio (que es `server-only`) llegan al bundle del navegador.
import type {
  AdminOrderListRow,
  AdminOrderWithItemsRow,
} from "@/server/repositories/order.repository";
import type { PageMeta } from "@/types/api";

/**
 * La forma la define el repositorio; lo único que cambia al viajar por HTTP son
 * los timestamptz, que llegan al cliente como strings ISO y no como `Date`.
 */
type Serialized<T extends { createdAt: Date; updatedAt: Date }> = Omit<
  T,
  "createdAt" | "updatedAt"
> & {
  createdAt: string;
  updatedAt: string;
};

/** Fila del listado del panel: la orden más su cliente ya resuelto por el join. */
export type AdminOrderListItem = Serialized<AdminOrderListRow>;

/** Detalle del panel: lo mismo que la fila más las líneas de la orden. */
export type AdminOrderDetail = Serialized<AdminOrderWithItemsRow>;

export type AdminOrderListResponse = {
  data: AdminOrderListItem[];
  meta: PageMeta;
};

// El detalle y el cambio de estado devuelven la misma envoltura: tras el PATCH
// la pantalla necesita la orden completa, no solo el estado nuevo.
export type AdminOrderDetailResponse = {
  data: AdminOrderDetail;
};
