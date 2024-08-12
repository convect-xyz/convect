ALTER TABLE "web_handler" DROP CONSTRAINT "web_handler_function_id_web_convectFunction_id_fk";
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "web_handler" ADD CONSTRAINT "web_handler_function_id_web_convectFunction_id_fk" FOREIGN KEY ("function_id") REFERENCES "public"."web_convectFunction"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
