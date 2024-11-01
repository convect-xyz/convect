CREATE TABLE IF NOT EXISTS "web_project_collaborator" (
	"projectId" integer NOT NULL,
	"userId" varchar NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "web_project_collaborator" ADD CONSTRAINT "web_project_collaborator_projectId_web_project_id_fk" FOREIGN KEY ("projectId") REFERENCES "public"."web_project"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "web_project_collaborator" ADD CONSTRAINT "web_project_collaborator_userId_web_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."web_user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "project_collaborator_projectId_idx" ON "web_project_collaborator" USING btree ("projectId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "project_collaborator_userId_idx" ON "web_project_collaborator" USING btree ("userId");