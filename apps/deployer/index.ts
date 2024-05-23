import * as aws from "@pulumi/aws";

const HANDLER_ID = process.env.HANDLER_ID;

const transactionQueue = new aws.sqs.Queue(`tx-queue-${HANDLER_ID}`);
