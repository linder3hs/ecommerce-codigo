ALTER TABLE "order_items" ADD COLUMN "unit_cost_cents" integer;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "cost_cents" integer;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_unit_cost_cents_check" CHECK ("order_items"."unit_cost_cents" is null or "order_items"."unit_cost_cents" >= 0);--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_cost_cents_check" CHECK ("products"."cost_cents" is null or "products"."cost_cents" >= 0);