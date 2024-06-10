import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";
import { getConfigForStack } from "./config";

export default async () => {
  const stackName = pulumi.getStack();
  const GITHUB_SHA = process.env.GITHUB_SHA!;

  const config = await getConfigForStack();
  const reportingQueue = new aws.sqs.Queue(`reporting-queue`, {
    visibilityTimeoutSeconds: 300,
  });

  const reportingHandler = new aws.lambda.Function(`reporting-handler`, {
    role: "arn:aws:iam::730335604495:role/orchestrator-lambda",
    s3Bucket: "ingest-functions",
    s3Key: `reporting/${GITHUB_SHA}.zip`,
    environment: {
      variables: {
        DATABASE_URL:
          "postgresql://postgres:postgres@example.cxy2caa825w6.eu-west-1.rds.amazonaws.com:5432/postgres?sslmode=require",
      },
    },
    timeout: 300,
    memorySize: 512,
    handler: "bootstrap",
    packageType: "Zip",
    runtime: "provided.al2023",
  });

  const handlerSourceMapping = new aws.lambda.EventSourceMapping(
    "reporing-handler-source-mapping",
    {
      eventSourceArn: reportingQueue.arn,
      functionName: reportingHandler.arn,
    }
  );

  const extension = new aws.lambda.LayerVersion("handler_extension", {
    layerName: `${stackName}_handler_extension`,
    compatibleArchitectures: ["x86_64"],
    compatibleRuntimes: ["provided.al2", "provided.al2023"],
    description: "Handler Extension",
    s3Bucket: "ingest-functions",
    s3Key: `extension/${GITHUB_SHA}.zip`,
    skipDestroy: true,
  });

  const handler_server = new aws.lambda.LayerVersion("handler_server", {
    layerName: `${stackName}_handler_server`,
    compatibleArchitectures: ["x86_64"],
    compatibleRuntimes: ["provided.al2", "provided.al2023"],
    description: "Handler HTTP Extension",
    s3Bucket: "ingest-functions",
    s3Key: `handler-server/${GITHUB_SHA}.zip`,
    skipDestroy: true,
  });

  const syncer = new aws.ecs.TaskDefinition("syncer_task_definition", {
    family: `${stackName}_syncer`,
    containerDefinitions: JSON.stringify([
      {
        name: "syncer",
        image: `730335604495.dkr.ecr.eu-west-1.amazonaws.com/syncer:${GITHUB_SHA}`,
        cpu: 0,
        portMappings: [
          {
            name: "syncer-80-tcp",
            containerPort: 80,
            hostPort: 80,
            protocol: "tcp",
            appProtocol: "http",
          },
          {
            name: "syncer-443-tcp",
            containerPort: 443,
            hostPort: 443,
            protocol: "tcp",
          },
        ],
        essential: true,
        environment: [
          {
            name: "PULUMI_ACCESS_TOKEN",
            value: config.pulumiAccessToken,
          },
          {
            name: "VERSION",
            value: stackName,
          },
          {
            name: "GITHUB_SHA",
            value: GITHUB_SHA,
          },
        ],
        mountPoints: [],
        volumesFrom: [],
        logConfiguration: {
          logDriver: "awslogs",
          options: {
            "awslogs-create-group": "true",
            "awslogs-group": "/ecs/syncers",
            "awslogs-region": "eu-west-1",
            "awslogs-stream-prefix": "ecs",
          },
        },
        systemControls: [],
      },
    ]),
    cpu: "512",
    memory: "1024",
    volumes: [],
    placementConstraints: [],
    requiresCompatibilities: ["FARGATE"],
    taskRoleArn: "arn:aws:iam::730335604495:role/ecsTaskExecutionRole",
    executionRoleArn: "arn:aws:iam::730335604495:role/ecsTaskExecutionRole",
    networkMode: "awsvpc",
    skipDestroy: true,
  });

  const builder = new aws.ecs.TaskDefinition(
    "builder_task_definition",
    {
      family: `${stackName}_builder`,
      containerDefinitions: JSON.stringify([
        {
          name: "builder",
          image: `730335604495.dkr.ecr.eu-west-1.amazonaws.com/builder:${GITHUB_SHA}`,
          cpu: 0,
          portMappings: [
            {
              name: "builder-80-tcp",
              containerPort: 80,
              hostPort: 80,
              protocol: "tcp",
              appProtocol: "http",
            },
            {
              name: "builder-443-tcp",
              containerPort: 443,
              hostPort: 443,
              protocol: "tcp",
            },
          ],
          essential: true,
          environment: [
            {
              name: "PULUMI_ACCESS_TOKEN",
              value: process.env.PULUMI_ACCESS_TOKEN,
            },
            {
              name: "VERSION",
              value: stackName,
            },
            {
              name: "GITHUB_SHA",
              value: GITHUB_SHA,
            },
          ],
          environmentFiles: [],
          mountPoints: [],
          volumesFrom: [],
          ulimits: [],
          logConfiguration: {
            logDriver: "awslogs",
            options: {
              "awslogs-create-group": "true",
              "awslogs-group": "/ecs/builder",
              "awslogs-region": "eu-west-1",
              "awslogs-stream-prefix": "ecs",
            },
            secretOptions: [],
          },
          systemControls: [],
        },
      ]),
      cpu: "512",
      memory: "1024",
      volumes: [],
      placementConstraints: [],
      requiresCompatibilities: ["FARGATE"],
      taskRoleArn: "arn:aws:iam::730335604495:role/ecsTaskExecutionRole",
      executionRoleArn: "arn:aws:iam::730335604495:role/ecsTaskExecutionRole",
      networkMode: "awsvpc",
      skipDestroy: true,
    },
    { dependsOn: [syncer] }
  );

  return {
    handler_extension_arn: extension.arn,
    handler_server_arn: handler_server.arn,
    builder_task_definition: builder.arn,
    syncer_task_definition: syncer.arn,
    reporting_handler_arn: reportingHandler.arn,
    reporting_queue_url: reportingQueue.url,
    github_sha: pulumi.Output.create(GITHUB_SHA),
    config: pulumi.secret(config),
  };
};
