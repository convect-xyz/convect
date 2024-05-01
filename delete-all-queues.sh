#!/bin/bash

# Fetch a list of all SQS queue URLs
queue_urls=$(aws sqs list-queues --query 'QueueUrls' --output text)

# Check if there are any queues to delete
if [ -z "$queue_urls" ]; then
  echo "No SQS queues found to delete."
  exit 0
fi

# Loop through the list of queue URLs and delete each one
for queue_url in $queue_urls; do
  echo "Deleting queue: $queue_url"
  aws sqs delete-queue --queue-url "$queue_url"

  if [ $? -eq 0 ]; then
    echo "Successfully deleted queue: $queue_url"
  else
    echo "Failed to delete queue: $queue_url"
  fi
done

echo "All queues processed."
