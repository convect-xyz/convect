DO $$ BEGIN
 CREATE TYPE "public"."deployment_mode" AS ENUM('init', 'update', 'destroy');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "web_deployment" ADD COLUMN "mode" "deployment_mode" DEFAULT 'init' NOT NULL;