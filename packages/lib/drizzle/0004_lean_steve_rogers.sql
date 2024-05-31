ALTER TABLE "web_api_key" ADD COLUMN "name" varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE "web_api_key" ADD CONSTRAINT "web_api_key_name_userId_unique" UNIQUE("name","userId");