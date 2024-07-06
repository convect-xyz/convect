CREATE TABLE IF NOT EXISTS "web_convectFunction" (
	"id" serial PRIMARY KEY NOT NULL,
	"projectId" integer NOT NULL,
	"name" varchar NOT NULL,
	"description" varchar DEFAULT '' NOT NULL,
	CONSTRAINT "web_convectFunction_name_projectId_unique" UNIQUE("name","projectId")
);
--> statement-breakpoint
ALTER TABLE "web_handler" DROP CONSTRAINT "web_handler_name_projectId_unique";--> statement-breakpoint
ALTER TABLE "web_handler" DROP CONSTRAINT "web_handler_projectId_web_project_id_fk";
--> statement-breakpoint
ALTER TABLE "web_handler" ADD COLUMN "function_id" integer;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "web_convectFunction" ADD CONSTRAINT "web_convectFunction_projectId_web_project_id_fk" FOREIGN KEY ("projectId") REFERENCES "public"."web_project"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "web_handler" ADD CONSTRAINT "web_handler_function_id_web_convectFunction_id_fk" FOREIGN KEY ("function_id") REFERENCES "public"."web_convectFunction"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

-- Insert new rows into web_convectFunction based on existing web_handler data
INSERT INTO "web_convectFunction" ("projectId", "name", "description")
SELECT "projectId", "name", "description"
FROM "web_handler";

-- Update web_handler to reference the newly created rows in web_convectFunction
UPDATE "web_handler" AS handler
SET "function_id" = convect.id
FROM "web_convectFunction" AS convect
WHERE handler."projectId" = convect."projectId"
AND handler."name" = convect."name"
AND handler."description" = convect."description";


ALTER TABLE "web_handler" DROP COLUMN IF EXISTS "projectId";--> statement-breakpoint
ALTER TABLE "web_handler" DROP COLUMN IF EXISTS "name";--> statement-breakpoint
ALTER TABLE "web_handler" DROP COLUMN IF EXISTS "description";
