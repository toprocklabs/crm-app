CREATE TABLE "project_repos" (
	"id" serial PRIMARY KEY NOT NULL,
	"full_name" text NOT NULL,
	"company_id" integer,
	"is_internal" boolean DEFAULT false NOT NULL,
	"is_private" boolean DEFAULT true NOT NULL,
	"archived" boolean DEFAULT false NOT NULL,
	"html_url" text,
	"last_push_at" timestamp with time zone,
	"last_commit_sha" text,
	"last_commit_message" text,
	"last_commit_author" text,
	"synced_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "proposal_documents" (
	"id" serial PRIMARY KEY NOT NULL,
	"proposal_id" integer NOT NULL,
	"pdf_base64" text NOT NULL,
	"byte_length" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "project_repos" ADD CONSTRAINT "project_repos_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proposal_documents" ADD CONSTRAINT "proposal_documents_proposal_id_proposals_id_fk" FOREIGN KEY ("proposal_id") REFERENCES "public"."proposals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "project_repos_full_name_unique" ON "project_repos" USING btree ("full_name");--> statement-breakpoint
CREATE INDEX "project_repos_company_idx" ON "project_repos" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "project_repos_last_push_idx" ON "project_repos" USING btree ("last_push_at");--> statement-breakpoint
CREATE UNIQUE INDEX "proposal_documents_proposal_unique" ON "proposal_documents" USING btree ("proposal_id");