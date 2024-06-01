DO $$ BEGIN
 CREATE TYPE "plan_type" AS ENUM('FREE', 'STARTUP', 'PROFESSIONAL');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "web_user" ADD COLUMN "plan_type" "plan_type" DEFAULT 'FREE';