CREATE TABLE "payment_methods" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"stripe_payment_method_id" varchar(255) NOT NULL,
	"brand" varchar(32) NOT NULL,
	"last4" varchar(4) NOT NULL,
	"exp_month" smallint NOT NULL,
	"exp_year" smallint NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payment_methods_stripe_payment_method_id_unique" UNIQUE("stripe_payment_method_id"),
	CONSTRAINT "payment_methods_exp_month_check" CHECK ("payment_methods"."exp_month" between 1 and 12)
);
--> statement-breakpoint
ALTER TABLE "orders" DROP CONSTRAINT "orders_stripe_checkout_session_id_unique";--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "stripe_checkout_session_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "stripe_customer_id" varchar(255);--> statement-breakpoint
ALTER TABLE "payment_methods" ADD CONSTRAINT "payment_methods_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "payment_methods_user_id_created_at_idx" ON "payment_methods" USING btree ("user_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX "payment_methods_user_default_unq" ON "payment_methods" USING btree ("user_id") WHERE "payment_methods"."is_default";--> statement-breakpoint
CREATE UNIQUE INDEX "orders_stripe_checkout_session_id_unq" ON "orders" USING btree ("stripe_checkout_session_id") WHERE "orders"."stripe_checkout_session_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "orders_stripe_payment_intent_id_unq" ON "orders" USING btree ("stripe_payment_intent_id") WHERE "orders"."stripe_payment_intent_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "users_stripe_customer_id_unq" ON "users" USING btree ("stripe_customer_id") WHERE "users"."stripe_customer_id" is not null;