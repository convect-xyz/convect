ALTER TABLE "web_deployment" ALTER COLUMN "manifest" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "web_deployment" ALTER COLUMN "manifestBucket" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "web_deployment" ALTER COLUMN "manifestKey" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "web_deployment" ALTER COLUMN "sourceBucket" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "web_deployment" ALTER COLUMN "sourceKey" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "web_deployment" ALTER COLUMN "version" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "web_deployment" ALTER COLUMN "mode" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "web_deployment" DROP COLUMN IF EXISTS "chains";