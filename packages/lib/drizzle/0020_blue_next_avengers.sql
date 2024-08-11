ALTER TABLE "web_deployment" DROP CONSTRAINT "web_deployment_handlerId_web_handler_id_fk";
--> statement-breakpoint
ALTER TABLE "web_deployment" DROP CONSTRAINT "web_deployment_functionId_web_convectFunction_id_fk";
--> statement-breakpoint
DROP INDEX IF EXISTS "deployment_handlerId_idx";--> statement-breakpoint
ALTER TABLE "web_deployment" ALTER COLUMN "functionId" SET NOT NULL;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "web_deployment" ADD CONSTRAINT "web_deployment_functionId_web_convectFunction_id_fk" FOREIGN KEY ("functionId") REFERENCES "public"."web_convectFunction"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "deployment_functionId_idx" ON "web_deployment" USING btree ("functionId");--> statement-breakpoint
ALTER TABLE "web_deployment" DROP COLUMN IF EXISTS "handlerId";