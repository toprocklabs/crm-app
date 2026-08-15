CREATE TYPE "public"."meeting_action_status" AS ENUM('todo', 'doing', 'done', 'deferred');--> statement-breakpoint
CREATE TABLE "meeting_action_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"meeting_id" integer NOT NULL,
	"company_id" integer NOT NULL,
	"owner" text NOT NULL,
	"action" text NOT NULL,
	"status" "meeting_action_status" DEFAULT 'todo' NOT NULL,
	"urgent" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "meeting_companies" (
	"meeting_id" integer NOT NULL,
	"company_id" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "meetings" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"meeting_date" date NOT NULL,
	"format" text,
	"status_label" text,
	"tldr" text,
	"body_md" text DEFAULT '' NOT NULL,
	"company_id" integer NOT NULL,
	"source" "data_source" DEFAULT 'manual' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "meeting_action_items" ADD CONSTRAINT "meeting_action_items_meeting_id_meetings_id_fk" FOREIGN KEY ("meeting_id") REFERENCES "public"."meetings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meeting_action_items" ADD CONSTRAINT "meeting_action_items_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meeting_companies" ADD CONSTRAINT "meeting_companies_meeting_id_meetings_id_fk" FOREIGN KEY ("meeting_id") REFERENCES "public"."meetings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meeting_companies" ADD CONSTRAINT "meeting_companies_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meetings" ADD CONSTRAINT "meetings_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "meeting_action_items_meeting_idx" ON "meeting_action_items" USING btree ("meeting_id");--> statement-breakpoint
CREATE INDEX "meeting_action_items_open_idx" ON "meeting_action_items" USING btree ("company_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "meeting_companies_pk" ON "meeting_companies" USING btree ("meeting_id","company_id");--> statement-breakpoint
CREATE INDEX "meeting_companies_company_idx" ON "meeting_companies" USING btree ("company_id");--> statement-breakpoint
CREATE UNIQUE INDEX "meetings_slug_unique" ON "meetings" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "meetings_company_date_idx" ON "meetings" USING btree ("company_id","meeting_date");--> statement-breakpoint
CREATE INDEX "meetings_date_idx" ON "meetings" USING btree ("meeting_date");