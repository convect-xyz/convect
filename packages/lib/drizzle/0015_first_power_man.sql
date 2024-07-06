CREATE TABLE IF NOT EXISTS "web_function_env" (
	"id" serial PRIMARY KEY NOT NULL,
	"function_id" integer NOT NULL,
	"key" varchar NOT NULL,
	"value" varchar NOT NULL,
	"iv" varchar NOT NULL,
	"last_updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "web_function_env_function_id_key_unique" UNIQUE("function_id","key")
);
--> statement-breakpoint
DROP TABLE "web_handler_env";--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "web_function_env" ADD CONSTRAINT "web_function_env_function_id_web_convectFunction_id_fk" FOREIGN KEY ("function_id") REFERENCES "public"."web_convectFunction"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
