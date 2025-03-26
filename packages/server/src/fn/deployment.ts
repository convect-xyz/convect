import { ECS, RunTaskCommand } from "@aws-sdk/client-ecs";
import { Manifest } from "@convect-xyz/lib";
import { eq, isNotNull } from "drizzle-orm";
import { Db } from "../db/db";
import * as schema from "../db/schema";
import {
  getCodeBucket,
  getCodePrefix,
  getManifestBucket,
  getManifestPrefix,
} from "./utils";

export class _DeploymentService {
  config: {
    db: Db;
    ecs: ECS;
  };

  constructor(options: { db: Db; ecs: ECS }) {
    this.config = options;
  }

  async create(options: {
    version: string;
    deploymentId: string;
    functionId: number;
    manifest: Manifest;
    mode: "init" | "update";
  }) {
    await this.config.db.insert(schema.deployment).values({
      id: options.deploymentId,
      functionId: options.functionId,
      ecsTaskId: "",
      status: "PENDING",
      manifest: JSON.stringify(options.manifest),
      manifestBucket: getManifestBucket(),
      manifestKey: getManifestPrefix(options.functionId, options.deploymentId),
      mode: options.mode,
      sourceKey: getCodePrefix(options.functionId, options.deploymentId),
      sourceBucket: getCodeBucket(),
      version: options.version,
    });
  }

  async confirm(options: {
    deploymentId: string;
    functionId: number;
    manifest: Manifest;
    builderTaskDefinition: string;
    dbUrl: string;
    encryptionKey: string;
    reportingDbUrl: string;
    redisUrl: string;
  }) {
    const deployment = await this.config.db.query.deployment.findFirst({
      where(fields, { eq }) {
        return eq(fields.id, options.deploymentId);
      },
    });

    if (!deployment) {
      throw new Error("Deployment not found");
    }

    const hasPendingOrRunning = await this.config.db.transaction(async (tx) => {
      const hasPendingOrRunning = await tx.query.deployment.findFirst({
        where(fields, { eq, and, or }) {
          return and(
            eq(fields.functionId, options.functionId),
            or(
              and(eq(fields.status, "PENDING"), isNotNull(fields.approvedAt)),
              eq(fields.status, "RUNNING")
            )
          );
        },
      });

      await this.config.db
        .update(schema.deployment)
        .set({
          approvedAt: new Date(),
        })
        .where(eq(schema.deployment.id, options.deploymentId));

      return !!hasPendingOrRunning;
    });

    if (hasPendingOrRunning) {
      return;
    }

    const command = new RunTaskCommand({
      cluster: "arn:aws:ecs:eu-west-1:730335604495:cluster/build",
      taskDefinition: options.builderTaskDefinition,
      networkConfiguration: {
        awsvpcConfiguration: {
          subnets: ["subnet-05d39f2476de29dc7"],
          assignPublicIp: "ENABLED",
        },
      },
      launchType: "FARGATE",
      overrides: {
        containerOverrides: [
          {
            name: "builder",
            environment: [
              { name: "ENV_DECRYPTION_KEY", value: options.encryptionKey },
              {
                name: "DATABASE_URL",
                value: options.dbUrl,
              },
              {
                name: "INITIAL_DEPLOYMENT_ID",
                value: options.deploymentId,
              },
              {
                name: "REPORTING_DB_URL",
                value: options.reportingDbUrl,
              },
              {
                name: "CONFIG__REDIS__URL",
                value: options.redisUrl,
              },
            ],
          },
        ],
      },
    });

    const output = await this.config.ecs.send(command);

    const task = output.tasks?.at(0);
    if (!task || !task.taskArn) {
      await this.config.db
        .delete(schema.deployment)
        .where(eq(schema.deployment.id, options.deploymentId));

      throw new Error("Task did not start");
    }

    await this.config.db.update(schema.deployment).set({
      ecsTaskId: task.taskArn,
    });
  }
}
