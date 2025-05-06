import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";
import { config } from "@infra/config";

export = async () => {
  const stackName = pulumi.getStack();
  const GITHUB_SHA = process.env.GITHUB_SHA!;

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
    cpu: "1024",
    memory: "2048",
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
              value: config.pulumi.accessToken,
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
      cpu: "1024",
      memory: "2048",
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
    handlerExtensionArn: extension.arn,
    handlerServerArn: handler_server.arn,
    builderTaskDefinition: builder.arn,
    syncerTaskDefinition: syncer.arn,
    githubSha: pulumi.output(GITHUB_SHA),
  };
};
