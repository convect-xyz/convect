import { ECS } from "@aws-sdk/client-ecs";
import { S3 } from "@aws-sdk/client-s3";
import { Manifest } from "@convect-xyz/lib";
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
}
