ALTER TABLE "web_project" ADD COLUMN "billing_status" text DEFAULT 'ACTIVE';--> statement-breakpoint
ALTER TABLE "web_project" ADD COLUMN "billing_status_updated_at" timestamp DEFAULT now();