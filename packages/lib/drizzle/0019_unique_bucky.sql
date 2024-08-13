ALTER TABLE "web_handler" DROP CONSTRAINT "web_handler_internal_id_unique";--> statement-breakpoint
ALTER TABLE "web_deployment" ADD COLUMN "functionId" integer;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "web_deployment" ADD CONSTRAINT "web_deployment_functionId_web_convectFunction_id_fk" FOREIGN KEY ("functionId") REFERENCES "public"."web_convectFunction"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "web_handler" DROP COLUMN IF EXISTS "internal_id";--> statement-breakpoint
ALTER TABLE "web_handler" DROP COLUMN IF EXISTS "version";

UPDATE "web_deployment" SET "functionId" = (SELECT "function_id" FROM "web_handler" WHERE "web_deployment"."handlerId" = "web_handler"."id");
