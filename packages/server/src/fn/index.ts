import { ECS, RunTaskCommand } from "@aws-sdk/client-ecs";
import { S3 } from "@aws-sdk/client-s3";
import { Manifest } from "@convect-xyz/lib";
import { eq } from "drizzle-orm";
import { v4 } from "uuid";
import { schema } from "..";
import { Db } from "../db/db";
import { _CodeService } from "./code";
import { _DeploymentService } from "./deployment";
import { _ManifestService } from "./manifest";

export class ConvectFunctionFacade {
  functionId: number;
  config: {
    s3: S3;
    db: Db;
    ecs: ECS;
  };
  deploymentService: _DeploymentService;
  manifestService: _ManifestService;
  codeService: _CodeService;

  constructor(functionId: number, config: typeof this.config) {
    this.config = config;
    this.functionId = functionId;
    this.deploymentService = new _DeploymentService({
      db: this.config.db,
      ecs: this.config.ecs,
    });
    this.manifestService = new _ManifestService({
      s3: this.config.s3,
      db: this.config.db,
    });
    this.codeService = new _CodeService({ s3: this.config.s3 });
  }

  async getManifest(deploymentId: string) {
    return this.manifestService.readFromS3(this.functionId, deploymentId);
  }

  async writeManifestToS3(manifest: Manifest, deploymentId: string) {
    return this.manifestService.writeToS3(
      this.functionId,
      deploymentId,
      manifest
    );
  }

  async updateManifest(manifest: Manifest, deploymentId: string) {
    return this.manifestService.update(this.functionId, deploymentId, manifest);
  }

  writeCode(options: { deploymentId: string; bundledCode: string }) {
    return this.codeService.writeBundledCode(
      this.functionId,
      options.deploymentId,
      options.bundledCode
    );
  }

  createDeployment(
    options: Omit<
      Parameters<typeof _DeploymentService.prototype.create>[0],
      "functionId"
    >
  ) {
    return this.deploymentService.create({
      ...options,
      functionId: this.functionId,
    });
  }

  confirmDeployment(
    options: Omit<
      Parameters<typeof _DeploymentService.prototype.confirm>[0],
      "functionId"
    >
  ) {
    return this.deploymentService.confirm({
      ...options,
      functionId: this.functionId,
    });
  }

  async destroy(options: {
    taskDefinition: string;
    version: string;
    databaseUrl: string;
  }) {
    const activeOrPendingDeployment =
      await this.config.db.query.deployment.findFirst({
        where: (fields, { eq, or, and }) => {
          return and(
            eq(fields.functionId, this.functionId),
            or(eq(fields.status, "SUCCESS"), eq(fields.status, "PENDING")),
            or(eq(fields.mode, "init"), eq(fields.mode, "update"))
          );
        },
      });

    if (!activeOrPendingDeployment) {
      await this.config.db
        .delete(schema.convectFunctions)
        .where(eq(schema.convectFunctions.id, this.functionId));
      return;
    }

    const deploymentId = v4();
    await this.config.db.insert(schema.deployment).values({
      id: deploymentId,
      functionId: this.functionId,
      ecsTaskId: "",
      status: "PENDING",
      manifest: "",
      manifestBucket: "",
      manifestKey: "",
      mode: "destroy",
      sourceKey: "",
      sourceBucket: "",
      version: options.version,
    });

    await this.config.ecs.send(
      new RunTaskCommand({
        cluster: "arn:aws:ecs:eu-west-1:730335604495:cluster/build",
        taskDefinition: options.taskDefinition,
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
                {
                  name: "INITIAL_DEPLOYMENT_ID",
                  value: deploymentId,
                },
                {
                  name: "DATABASE_URL",
                  value: options.databaseUrl,
                },
                {
                  name: "CURR_DIR",
                  value: "/tmp",
                },
                {
                  name: "ENV_DECRYPTION_KEY",
                  value: "test",
                },
              ],
            },
          ],
        },
      })
    );
  }
}
