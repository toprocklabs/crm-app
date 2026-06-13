CREATE TYPE "public"."data_source" AS ENUM('manual', 'drive', 'gmail', 'agent');--> statement-breakpoint
CREATE TYPE "public"."edge_type" AS ENUM('referred_by', 'colocated_with', 'introduced_by', 'knows', 'vendor_of', 'customer_of', 'partner_of', 'competitor_of');--> statement-breakpoint
CREATE TYPE "public"."entity_type" AS ENUM('company', 'contact');--> statement-breakpoint
CREATE TYPE "public"."suggestion_status" AS ENUM('pending', 'approved', 'rejected', 'auto_applied');--> statement-breakpoint
CREATE TABLE "agent_runs" (
	"id" serial PRIMARY KEY NOT NULL,
	"loop" text NOT NULL,
	"model" text,
	"status" text DEFAULT 'running' NOT NULL,
	"tokens_in" integer DEFAULT 0 NOT NULL,
	"tokens_out" integer DEFAULT 0 NOT NULL,
	"cost_cents" integer DEFAULT 0 NOT NULL,
	"items_seen" integer DEFAULT 0 NOT NULL,
	"items_proposed" integer DEFAULT 0 NOT NULL,
	"notes" text,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "place_enrichment" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"formatted_address" text,
	"lat" double precision,
	"lng" double precision,
	"plaza_key" text,
	"provider" text,
	"geocoded_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "relationships" (
	"id" serial PRIMARY KEY NOT NULL,
	"from_type" "entity_type" NOT NULL,
	"from_id" integer NOT NULL,
	"to_type" "entity_type" NOT NULL,
	"to_id" integer NOT NULL,
	"edge_type" "edge_type" NOT NULL,
	"strength" integer DEFAULT 50 NOT NULL,
	"evidence" text,
	"source" "data_source" DEFAULT 'manual' NOT NULL,
	"last_confirmed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "suggestions" (
	"id" serial PRIMARY KEY NOT NULL,
	"kind" text NOT NULL,
	"title" text NOT NULL,
	"payload" jsonb NOT NULL,
	"confidence" integer DEFAULT 0 NOT NULL,
	"evidence" text,
	"source" "data_source" DEFAULT 'agent' NOT NULL,
	"status" "suggestion_status" DEFAULT 'pending' NOT NULL,
	"auto_applied" boolean DEFAULT false NOT NULL,
	"agent_run_id" integer,
	"resolved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "activities" ADD COLUMN "source" "data_source" DEFAULT 'manual' NOT NULL;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "address" text;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "lat" double precision;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "lng" double precision;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "plaza_key" text;--> statement-breakpoint
ALTER TABLE "place_enrichment" ADD CONSTRAINT "place_enrichment_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "place_enrichment_company_unique" ON "place_enrichment" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "place_enrichment_plaza_idx" ON "place_enrichment" USING btree ("plaza_key");--> statement-breakpoint
CREATE INDEX "relationships_from_idx" ON "relationships" USING btree ("from_type","from_id");--> statement-breakpoint
CREATE INDEX "relationships_to_idx" ON "relationships" USING btree ("to_type","to_id");--> statement-breakpoint
CREATE UNIQUE INDEX "relationships_unique_edge" ON "relationships" USING btree ("from_type","from_id","to_type","to_id","edge_type");--> statement-breakpoint
CREATE INDEX "suggestions_status_idx" ON "suggestions" USING btree ("status");
