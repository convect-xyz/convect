CREATE TABLE IF NOT EXISTS "web_account" (
	"userId" varchar NOT NULL,
	"type" varchar(255) NOT NULL,
	"provider" varchar(255) NOT NULL,
	"providerAccountId" varchar(255) NOT NULL,
	"refresh_token" text,
	"refresh_token_expires_in" integer,
	"access_token" text,
	"expires_at" integer,
	"token_type" varchar(255),
	"scope" varchar(255),
	"id_token" text,
	"session_state" varchar(255),
	CONSTRAINT "web_account_provider_providerAccountId_pk" PRIMARY KEY("provider","providerAccountId")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "web_deployment" (
	"id" serial PRIMARY KEY NOT NULL,
	"handlerId" integer NOT NULL,
	"ecsTaskId" varchar(255) NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "web_handler" (
	"id" serial PRIMARY KEY NOT NULL,
	"projectId" integer NOT NULL,
	"name" varchar NOT NULL,
	"producerId" integer NOT NULL,
	"txQueueUrl" varchar,
	"logFetcherArn" varchar,
	"orchestratorArn" varchar,
	"handlerArn" varchar,
	"handlerLogGroup" varchar,
	"handlerToTxQueueEventSourceMappingUuid" varchar,
	"orchestratorSubscriptionArn" varchar,
	CONSTRAINT "web_handler_name_projectId_unique" UNIQUE("name","projectId")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "web_handler_env" (
	"id" serial PRIMARY KEY NOT NULL,
	"handler_id" integer NOT NULL,
	"key" varchar NOT NULL,
	"value" varchar NOT NULL,
	"iv" varchar NOT NULL,
	"last_updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "web_handler_env_handler_id_key_unique" UNIQUE("handler_id","key")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "web_producer" (
	"id" serial PRIMARY KEY NOT NULL,
	"altId" varchar(255) NOT NULL,
	"pollingUrl" varchar(255) NOT NULL,
	"wsUrl" varchar(255) NOT NULL,
	"userId" varchar,
	"serviceArn" varchar(255),
	"topicArn" varchar(255),
	"name" varchar NOT NULL,
	CONSTRAINT "web_producer_altId_unique" UNIQUE("altId"),
	CONSTRAINT "web_producer_userId_name_unique" UNIQUE("userId","name")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "web_project" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"userId" varchar NOT NULL,
	CONSTRAINT "web_project_name_userId_unique" UNIQUE("name","userId")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "web_session" (
	"sessionToken" varchar(255) PRIMARY KEY NOT NULL,
	"userId" varchar NOT NULL,
	"expires" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "web_user" (
	"id" varchar PRIMARY KEY NOT NULL,
	"name" varchar(255),
	"email" varchar(255) NOT NULL,
	"emailVerified" timestamp DEFAULT CURRENT_TIMESTAMP,
	"image" varchar(255)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "web_verificationToken" (
	"identifier" varchar(255) NOT NULL,
	"token" varchar(255) NOT NULL,
	"expires" timestamp NOT NULL,
	CONSTRAINT "web_verificationToken_identifier_token_pk" PRIMARY KEY("identifier","token")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "account_userId_idx" ON "web_account" ("userId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "deployment_handlerId_idx" ON "web_deployment" ("handlerId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "producers_userId_idx" ON "web_producer" ("userId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "project_userId_idx" ON "web_project" ("userId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "session_userId_idx" ON "web_session" ("userId");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "web_account" ADD CONSTRAINT "web_account_userId_web_user_id_fk" FOREIGN KEY ("userId") REFERENCES "web_user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "web_deployment" ADD CONSTRAINT "web_deployment_handlerId_web_handler_id_fk" FOREIGN KEY ("handlerId") REFERENCES "web_handler"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "web_handler" ADD CONSTRAINT "web_handler_projectId_web_project_id_fk" FOREIGN KEY ("projectId") REFERENCES "web_project"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "web_handler" ADD CONSTRAINT "web_handler_producerId_web_producer_id_fk" FOREIGN KEY ("producerId") REFERENCES "web_producer"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "web_handler_env" ADD CONSTRAINT "web_handler_env_handler_id_web_handler_id_fk" FOREIGN KEY ("handler_id") REFERENCES "web_handler"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "web_producer" ADD CONSTRAINT "web_producer_userId_web_user_id_fk" FOREIGN KEY ("userId") REFERENCES "web_user"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "web_project" ADD CONSTRAINT "web_project_userId_web_user_id_fk" FOREIGN KEY ("userId") REFERENCES "web_user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "web_session" ADD CONSTRAINT "web_session_userId_web_user_id_fk" FOREIGN KEY ("userId") REFERENCES "web_user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
