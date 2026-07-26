CREATE TYPE "public"."payment_status" AS ENUM('succeeded', 'refunded', 'partially_refunded', 'failed');--> statement-breakpoint
CREATE TYPE "public"."payment_type" AS ENUM('one_time', 'recurring');--> statement-breakpoint
CREATE TABLE "payments" (
	"id" serial PRIMARY KEY NOT NULL,
	"stripe_charge_id" text NOT NULL,
	"company_id" integer,
	"stripe_customer_id" text,
	"amount_cents" integer NOT NULL,
	"fee_cents" integer DEFAULT 0 NOT NULL,
	"refunded_cents" integer DEFAULT 0 NOT NULL,
	"currency" text DEFAULT 'usd' NOT NULL,
	"status" "payment_status" DEFAULT 'succeeded' NOT NULL,
	"type" "payment_type" DEFAULT 'one_time' NOT NULL,
	"description" text,
	"receipt_url" text,
	"stripe_invoice_id" text,
	"stripe_subscription_id" text,
	"livemode" boolean DEFAULT true NOT NULL,
	"paid_at" timestamp with time zone,
	"synced_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stripe_subscriptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"stripe_subscription_id" text NOT NULL,
	"company_id" integer,
	"stripe_customer_id" text,
	"status" text NOT NULL,
	"monthly_amount_cents" integer DEFAULT 0 NOT NULL,
	"interval" text,
	"current_period_end" timestamp with time zone,
	"canceled_at" timestamp with time zone,
	"livemode" boolean DEFAULT true NOT NULL,
	"synced_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "stripe_customer_id" text;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stripe_subscriptions" ADD CONSTRAINT "stripe_subscriptions_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "payments_stripe_charge_unique" ON "payments" USING btree ("stripe_charge_id");--> statement-breakpoint
CREATE INDEX "payments_company_idx" ON "payments" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "payments_company_type_idx" ON "payments" USING btree ("company_id","type");--> statement-breakpoint
CREATE INDEX "payments_customer_idx" ON "payments" USING btree ("stripe_customer_id");--> statement-breakpoint
CREATE INDEX "payments_paid_at_idx" ON "payments" USING btree ("paid_at");--> statement-breakpoint
CREATE UNIQUE INDEX "stripe_subscriptions_unique" ON "stripe_subscriptions" USING btree ("stripe_subscription_id");--> statement-breakpoint
CREATE INDEX "stripe_subscriptions_company_idx" ON "stripe_subscriptions" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "stripe_subscriptions_status_idx" ON "stripe_subscriptions" USING btree ("status");