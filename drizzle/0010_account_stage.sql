CREATE TYPE "public"."account_stage" AS ENUM('new_lead', 'attempting_to_engage', 'engaged', 'in_pipeline', 'customer');--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "stage" "account_stage" DEFAULT 'new_lead' NOT NULL;
