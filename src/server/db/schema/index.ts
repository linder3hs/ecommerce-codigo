// Barrel de tablas. Cada spec agrega su archivo (product.ts, order.ts, ...)
// y lo re-exporta aquí para que drizzle-kit y el cliente lo descubran.
export * from "./audit-log";
export * from "./category";
export * from "./expense";
export * from "./order";
export * from "./payment-method";
export * from "./permission";
export * from "./product";
export * from "./role";
export * from "./role-permission";
export * from "./user";
export * from "./user-role";
