ALTER TABLE "web_producer" RENAME COLUMN "altId" TO "chain_id";--> statement-breakpoint
ALTER TABLE "web_producer" DROP CONSTRAINT "web_producer_altId_unique";--> statement-breakpoint
ALTER TABLE "web_handler" ADD COLUMN "infra_version" varchar DEFAULT 'infra-dev' NOT NULL;--> statement-breakpoint
ALTER TABLE "web_producer" ADD CONSTRAINT "web_producer_chain_id_unique" UNIQUE("chain_id");
