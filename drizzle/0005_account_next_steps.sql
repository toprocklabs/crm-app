ALTER TABLE "companies" ADD COLUMN "next_step" text DEFAULT '' NOT NULL;
ALTER TABLE "companies" ADD COLUMN "next_step_due_date" date;
