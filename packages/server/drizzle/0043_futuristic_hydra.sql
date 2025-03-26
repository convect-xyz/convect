ALTER TYPE "deployment_status" ADD VALUE 'WAITING_FOR_APPROVAL';--> statement-breakpoint
ALTER TABLE "web_deployment" ADD COLUMN "approvedAt" timestamp;