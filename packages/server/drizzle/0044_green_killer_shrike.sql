ALTER TABLE "web_project_collaborator" DROP CONSTRAINT "web_project_collaborator_projectId_userId_unique";--> statement-breakpoint
ALTER TABLE "web_producer" ALTER COLUMN "pollingUrls" SET DATA TYPE text[];--> statement-breakpoint
ALTER TABLE "web_project_collaborator" ADD CONSTRAINT "web_project_collaborator_projectId_userId_pk" PRIMARY KEY("projectId","userId");