ALTER TABLE "web_producer" ADD COLUMN "pollingUrls" varchar(255)[] DEFAULT ARRAY[]::varchar[];--> statement-breakpoint
ALTER TABLE "web_producer" DROP COLUMN IF EXISTS "pollingUrl";