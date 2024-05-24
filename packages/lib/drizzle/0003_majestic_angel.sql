CREATE TABLE IF NOT EXISTS "web_api_key" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" varchar NOT NULL,
	"token" varchar(255) NOT NULL,
	CONSTRAINT "web_api_key_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "apiKey_userId_idx" ON "web_api_key" ("userId");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "web_api_key" ADD CONSTRAINT "web_api_key_userId_web_user_id_fk" FOREIGN KEY ("userId") REFERENCES "web_user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
