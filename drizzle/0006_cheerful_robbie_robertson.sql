CREATE TYPE "public"."expense_category" AS ENUM('shipping', 'marketing', 'payroll', 'payment_fees', 'other');--> statement-breakpoint
CREATE TABLE "expenses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"category" "expense_category" NOT NULL,
	"amount_cents" integer NOT NULL,
	"expense_date" date NOT NULL,
	"description" text,
	"created_by" uuid NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "expenses_amount_cents_check" CHECK ("expenses"."amount_cents" > 0)
);
--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "expenses_expense_date_idx" ON "expenses" USING btree ("expense_date" DESC NULLS LAST,"created_at" DESC NULLS LAST) WHERE "expenses"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "expenses_category_expense_date_idx" ON "expenses" USING btree ("category","expense_date" DESC NULLS LAST) WHERE "expenses"."deleted_at" is null;