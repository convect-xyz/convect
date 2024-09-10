import "server-only";

type GetHandlerArnOptions = {
  handlerId: string;
  region: "eu-west-1";
};

export function getHandlerArn(options: GetHandlerArnOptions) {
  return `arn:aws:lambda:${options.region}:730335604495:function:handler-${options.handlerId}`;
}

export function getLogFetcherArn(options: GetHandlerArnOptions) {
  return `arn:aws:lambda:${options.region}:730335604495:function:log-fetcher-${options.handlerId}`;
}

export function getOrchestratorArn(options: GetHandlerArnOptions) {
  return `arn:aws:lambda:${options.region}:730335604495:function:orchestrator-${options.handlerId}`;
}

export function getTxQueueUrl(options: GetHandlerArnOptions) {
  return `https://sqs.${options.region}.amazonaws.com/730335604495/tx-queue-${options.handlerId}.fifo`;
}

export function getReportingArn(options: GetHandlerArnOptions) {
  return `arn:aws:lambda:${options.region}:730335604495:function:reporting-${options.handlerId}`;
}

export function getEventsArn(options: GetHandlerArnOptions) {
  return `arn:aws:lambda:${options.region}:730335604495:function:events-${options.handlerId}`;
}
