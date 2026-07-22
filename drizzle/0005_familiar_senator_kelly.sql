CREATE TYPE "public"."proposal_status" AS ENUM('draft', 'sent', 'viewed', 'signed', 'declined', 'superseded');--> statement-breakpoint
CREATE TABLE "proposals" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"deal_id" integer,
	"contact_id" integer,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"pin" text NOT NULL,
	"status" "proposal_status" DEFAULT 'draft' NOT NULL,
	"client_name" text DEFAULT '' NOT NULL,
	"business" text DEFAULT '' NOT NULL,
	"proposal_date" text DEFAULT '' NOT NULL,
	"content_md" text DEFAULT '' NOT NULL,
	"signed_pdf_base64" text,
	"signer_name" text,
	"signer_email" text,
	"signed_at" timestamp with time zone,
	"sent_at" timestamp with time zone,
	"first_viewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "proposals" ADD CONSTRAINT "proposals_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proposals" ADD CONSTRAINT "proposals_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proposals" ADD CONSTRAINT "proposals_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "proposals_slug_unique" ON "proposals" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "proposals_company_idx" ON "proposals" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "proposals_status_idx" ON "proposals" USING btree ("status");