ALTER TABLE "web_deployment" ADD COLUMN "manifestBucket" varchar(255) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "web_deployment" ADD COLUMN "manifestKey" varchar(255) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "web_deployment" ADD COLUMN "sourceBucket" varchar(255) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "web_deployment" ADD COLUMN "sourceKey" varchar(255) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "web_deployment" ADD COLUMN "chains" json DEFAULT '[]'::json NOT NULL;--> statement-breakpoint
ALTER TABLE "web_deployment" ADD COLUMN "version" varchar(255) DEFAULT '' NOT NULL;