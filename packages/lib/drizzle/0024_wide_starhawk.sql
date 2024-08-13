DROP TABLE "web_handler";--> statement-breakpoint
ALTER TABLE "web_convectFunction" ADD COLUMN "globalId" varchar DEFAULT gen_random_uuid() NOT NULL;