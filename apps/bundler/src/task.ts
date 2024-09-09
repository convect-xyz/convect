import { and, eq, InferSelectModel, lte, or } from "drizzle-orm";
import path from "path";
import { db } from "./db";
import schema from "./db/schema";
import { env } from "./env";

type CurrentDeployment = InferSelectModel<typeof schema.deployment> & {
  function: InferSelectModel<typeof schema.convectFunctions> & {
    envs: Array<InferSelectModel<typeof schema.functionEnv>>;
  };
};
class DeploymentTask {
  currentDeployment: CurrentDeployment | undefined;

  constructor(currentDeployment: CurrentDeployment) {
    this.currentDeployment = currentDeployment;
  }

  async next() {
    this.currentDeployment = await db.transaction(async (tx) => {
      const currentDeployment = await db
        .update(schema.deployment)
        .set({
          status: "SUCCESS",
        })
        .where(
          or(
            eq(schema.deployment.id, this.currentDeployment!.id),
            and(
              eq(
                schema.deployment.functionId,
                this.currentDeployment!.functionId
              ),
              lte(
                schema.deployment.createdAt,
                this.currentDeployment!.createdAt
              ),
              eq(schema.deployment.status, "PENDING")
            )
          )
        )
        .returning()
        .then((r) => r[0]);

      return tx.query.deployment.findFirst({
        where(fields, { eq, and }) {
          return and(
            eq(fields.functionId, currentDeployment.functionId),
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
      });
    });

    return this.currentDeployment;
  }

  async fail() {
    await db
      .update(schema.deployment)
      .set({
        status: "FAILED",
      })
      .where(
        or(
          eq(schema.deployment.id, this.currentDeployment!.id),
          and(
            eq(
              schema.deployment.functionId,
              this.currentDeployment!.functionId
            ),
            lte(schema.deployment.createdAt, this.currentDeployment!.createdAt),
            eq(schema.deployment.status, "PENDING")
          )
        )
      );
  }

  async getDirInfo() {
    const handlerSrcFile = path.join(
      env.CURR_DIR,
      this.currentDeployment!.sourceKey + ".js"
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

var deploymentTask: DeploymentTask;

export async function getDeploymentTask() {
  if (deploymentTask) {
    return deploymentTask;
  }

  const deploymentId = env.INITIAL_DEPLOYMENT_ID;

  const deployment = await getPendingDeployment(deploymentId);

  return new DeploymentTask(deployment);
}

export async function getCurrentDeployment() {
  const deploymentTask = await getDeploymentTask();
  if (!deploymentTask.currentDeployment) {
    throw new Error("Deployment not found");
  }

  return deploymentTask.currentDeployment!;
}

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
