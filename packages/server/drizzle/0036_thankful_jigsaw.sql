ALTER TABLE "web_user" DROP CONSTRAINT "web_user_stripe_customer_id_unique";--> statement-breakpoint
ALTER TABLE "web_user" DROP CONSTRAINT "web_user_stripe_subscription_id_unique";--> statement-breakpoint
ALTER TABLE "web_project" ADD COLUMN "stripe_customer_id" varchar(255);--> statement-breakpoint
ALTER TABLE "web_project" ADD COLUMN "stripe_subscription_id" varchar(255);--> statement-breakpoint
ALTER TABLE "web_user" DROP COLUMN IF EXISTS "stripe_customer_id";--> statement-breakpoint
ALTER TABLE "web_user" DROP COLUMN IF EXISTS "stripe_subscription_id";--> statement-breakpoint
ALTER TABLE "web_project" ADD CONSTRAINT "web_project_stripe_customer_id_unique" UNIQUE("stripe_customer_id");--> statement-breakpoint
ALTER TABLE "web_project" ADD CONSTRAINT "web_project_stripe_subscription_id_unique" UNIQUE("stripe_subscription_id");