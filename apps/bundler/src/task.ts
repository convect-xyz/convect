import { desc, eq, InferSelectModel } from "drizzle-orm";
import path from "path";
import { db } from "./db";
import schema from "./db/schema";
import { env } from "./env";

type Deployment = InferSelectModel<typeof schema.deployment> & {
  function: InferSelectModel<typeof schema.convectFunctions> & {
    envs: Array<InferSelectModel<typeof schema.functionEnv>>;
  };
};

var deploymentTask: DeploymentManager;

async function getPendingDeployment(deploymentId: string) {
  const deployment = await db.query.deployment.findFirst({
    where(fields, { eq, and }) {
      return and(eq(fields.id, deploymentId), eq(fields.status, "PENDING"));
    },
    with: {
      function: {
        with: {
          envs: true,
        },
      },
    },
  });

  if (!deployment) {
    throw new Error("Deployment not found");
  }

  return deployment;
}

export class DeploymentManager {
  functionId: number;
  current: DeploymentTask | undefined;

  constructor(currentDeployment: Deployment) {
    this.current = new DeploymentTask(currentDeployment);
    this.functionId = currentDeployment.functionId;
  }

  static async getOrCreate() {
    if (!deploymentTask) {
      const deployment = await getPendingDeployment(env.INITIAL_DEPLOYMENT_ID);
      deploymentTask = new DeploymentManager(deployment);
    }

    return deploymentTask;
  }

  async next() {
    const nextDeployment = await db.transaction(async (tx) => {
      await this.current?.done(tx);

      return await tx.query.deployment.findFirst({
        where: (fields, { eq, and }) => {
          return and(
            eq(fields.functionId, this.functionId),
            eq(fields.status, "PENDING")
          );
        },
        with: {
          function: {
            with: {
              envs: true,
            },
          },
        },
        orderBy: desc(schema.deployment.createdAt),
      });
    });

    this.current = nextDeployment
      ? new DeploymentTask(nextDeployment)
      : undefined;

    return this.current;
  }
}

class DeploymentTask {
  constructor(public deployment: Deployment) {}

  async start(executor?: typeof db) {
    await (executor ?? db)
      .update(schema.deployment)
      .set({
        status: "RUNNING",
        runningAt: new Date(),
      })
      .where(eq(schema.deployment.id, this.deployment.id));
    await this.refresh();
  }

  async fail(executor?: typeof db) {
    await (executor ?? db)
      .update(schema.deployment)
      .set({
        status: "FAILED",
        finishedAt: new Date(),
      })
      .where(eq(schema.deployment.id, this.deployment.id));
    await this.refresh();
  }

  async done(executor?: typeof db) {
    await (executor ?? db)
      .update(schema.deployment)
      .set({
        status: "SUCCESS",
        finishedAt: new Date(),
      })
      .where(eq(schema.deployment.id, this.deployment.id))
      .returning()
      .then((r) => r[0]);
    await this.refresh();
  }

  async refresh() {
    this.deployment = await db.query.deployment
      .findFirst({
        where: (fields, { eq }) => {
          return eq(fields.id, this.deployment.id);
        },
        with: {
          function: {
            with: {
              envs: true,
            },
          },
        },
      })
      .then((r) => r!);
  }

  async getDirInfo() {
    const handlerSrcFile = path.join(
      env.CURR_DIR,
      this.deployment!.sourceKey + ".js"
    );
    const bundleSrcDir = path.join(env.CURR_DIR, "bundle_src");
    const bundleOutDir = path.join(env.CURR_DIR, "bundle_out");
    const runtimeSrcFile = "/scripts/runtime.js";
    const bundleOutFile = path.join(bundleOutDir, "index.js");

    return {
      handlerSrcFile,
      bundleSrcDir,
      bundleOutDir,
      runtimeSrcFile,
      bundleOutFile,
    };
  }
}
