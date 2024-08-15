CREATE TABLE IF NOT EXISTS "web_pending_invite" (
	"id" serial PRIMARY KEY NOT NULL,
	"projectId" integer NOT NULL,
	"userId" varchar NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "web_pending_invite" ADD CONSTRAINT "web_pending_invite_projectId_web_project_id_fk" FOREIGN KEY ("projectId") REFERENCES "public"."web_project"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "web_pending_invite" ADD CONSTRAINT "web_pending_invite_userId_web_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."web_user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pending_invite_projectId_idx" ON "web_pending_invite" USING btree ("projectId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pending_invite_userId_idx" ON "web_pending_invite" USING btree ("userId");