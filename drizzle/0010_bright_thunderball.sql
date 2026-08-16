CREATE TYPE "public"."brain_doc_kind" AS ENUM('entity', 'digest', 'meta');--> statement-breakpoint
CREATE TABLE "brain_document_links" (
	"id" serial PRIMARY KEY NOT NULL,
	"source_doc_id" integer NOT NULL,
	"raw_target" text NOT NULL,
	"target_doc_id" integer
);
--> statement-breakpoint
CREATE TABLE "brain_documents" (
	"id" serial PRIMARY KEY NOT NULL,
	"path" text NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"kind" "brain_doc_kind" NOT NULL,
	"folder" text NOT NULL,
	"note_date" date,
	"body_md" text DEFAULT '' NOT NULL,
	"frontmatter" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"content_sha" text NOT NULL,
	"company_id" integer,
	"contact_id" integer,
	"source" "data_source" DEFAULT 'manual' NOT NULL,
	"search_text" text DEFAULT '' NOT NULL,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "brain_document_links" ADD CONSTRAINT "brain_document_links_source_doc_id_brain_documents_id_fk" FOREIGN KEY ("source_doc_id") REFERENCES "public"."brain_documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brain_document_links" ADD CONSTRAINT "brain_document_links_target_doc_id_brain_documents_id_fk" FOREIGN KEY ("target_doc_id") REFERENCES "public"."brain_documents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brain_documents" ADD CONSTRAINT "brain_documents_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brain_documents" ADD CONSTRAINT "brain_documents_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "brain_document_links_source_idx" ON "brain_document_links" USING btree ("source_doc_id");--> statement-breakpoint
CREATE INDEX "brain_document_links_target_idx" ON "brain_document_links" USING btree ("target_doc_id");--> statement-breakpoint
CREATE UNIQUE INDEX "brain_documents_path_unique" ON "brain_documents" USING btree ("path");--> statement-breakpoint
CREATE UNIQUE INDEX "brain_documents_slug_unique" ON "brain_documents" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "brain_documents_company_idx" ON "brain_documents" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "brain_documents_kind_date_idx" ON "brain_documents" USING btree ("kind","note_date");