ALTER TABLE "activities" ADD COLUMN "logged_by_user_id" integer;
ALTER TABLE "activities" ADD CONSTRAINT "activities_logged_by_user_id_users_id_fk" FOREIGN KEY ("logged_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
