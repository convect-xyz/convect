ALTER TABLE "web_project" ADD COLUMN "plan_type" "plan_type" DEFAULT 'HOBBY' NOT NULL;--> statement-breakpoint
ALTER TABLE "web_project" ADD COLUMN "plan_url" varchar(255);--> statement-breakpoint
ALTER TABLE "web_user" DROP COLUMN IF EXISTS "plan_type";--> statement-breakpoint
ALTER TABLE "web_user" DROP COLUMN IF EXISTS "plan_url";