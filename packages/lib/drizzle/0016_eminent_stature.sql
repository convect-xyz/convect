DO $$ BEGIN
 CREATE TYPE "public"."deployment_status" AS ENUM('PENDING', 'RUNNING', 'SUCCESS', 'FAILED');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "web_deployment" ADD COLUMN "status" "deployment_status" NOT NULL;--> statement-breakpoint
ALTER TABLE "web_deployment" ADD COLUMN "createdAt" timestamp DEFAULT now() NOT NULL;