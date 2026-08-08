-- NOTE: db:generate also emitted two `ALTER TABLE payments ADD COLUMN
-- billing_email/billing_name` statements here. Both columns already exist in
-- the live database (added during plan 003 via db:push); the drizzle meta
-- snapshot had drifted. Removed so this file matches what db:push applied.
CREATE INDEX "activities_company_idx" ON "activities" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "activities_contact_idx" ON "activities" USING btree ("contact_id");--> statement-breakpoint
CREATE INDEX "activities_deal_idx" ON "activities" USING btree ("deal_id");--> statement-breakpoint
CREATE INDEX "activities_occurred_at_idx" ON "activities" USING btree ("occurred_at");--> statement-breakpoint
CREATE INDEX "companies_stage_idx" ON "companies" USING btree ("stage");--> statement-breakpoint
CREATE INDEX "companies_created_at_idx" ON "companies" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "companies_stripe_customer_idx" ON "companies" USING btree ("stripe_customer_id");--> statement-breakpoint
CREATE INDEX "companies_plaza_idx" ON "companies" USING btree ("plaza_key");--> statement-breakpoint
CREATE INDEX "deals_company_idx" ON "deals" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "deals_stage_idx" ON "deals" USING btree ("stage");--> statement-breakpoint
CREATE INDEX "sales_tasks_company_idx" ON "sales_tasks" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "sales_tasks_deal_idx" ON "sales_tasks" USING btree ("deal_id");--> statement-breakpoint
CREATE INDEX "sales_tasks_status_due_idx" ON "sales_tasks" USING btree ("status","due_date");