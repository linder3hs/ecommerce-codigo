CREATE TABLE "products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(160) NOT NULL,
	"slug" varchar(180) NOT NULL,
	"sku" varchar(64) NOT NULL,
	"description" text,
	"price_cents" integer NOT NULL,
	"compare_at_price_cents" integer,
	"stock" integer DEFAULT 0 NOT NULL,
	"category_id" uuid NOT NULL,
	"image_url" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "products_price_cents_check" CHECK ("products"."price_cents" >= 0),
	CONSTRAINT "products_compare_at_price_cents_check" CHECK ("products"."compare_at_price_cents" is null or "products"."compare_at_price_cents" >= 0),
	CONSTRAINT "products_stock_check" CHECK ("products"."stock" >= 0)
);
--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "products_slug_active_unq" ON "products" USING btree ("slug") WHERE "products"."deleted_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "products_sku_active_unq" ON "products" USING btree ("sku") WHERE "products"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "products_category_id_idx" ON "products" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "products_created_at_idx" ON "products" USING btree ("created_at" DESC NULLS LAST);