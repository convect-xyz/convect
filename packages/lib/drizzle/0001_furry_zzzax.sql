ALTER TABLE "web_handler" DROP COLUMN IF EXISTS "txQueueUrl";--> statement-breakpoint
ALTER TABLE "web_handler" DROP COLUMN IF EXISTS "logFetcherArn";--> statement-breakpoint
ALTER TABLE "web_handler" DROP COLUMN IF EXISTS "orchestratorArn";--> statement-breakpoint
ALTER TABLE "web_handler" DROP COLUMN IF EXISTS "handlerArn";--> statement-breakpoint
ALTER TABLE "web_handler" DROP COLUMN IF EXISTS "handlerLogGroup";--> statement-breakpoint
ALTER TABLE "web_handler" DROP COLUMN IF EXISTS "handlerToTxQueueEventSourceMappingUuid";--> statement-breakpoint
ALTER TABLE "web_handler" DROP COLUMN IF EXISTS "orchestratorSubscriptionArn";