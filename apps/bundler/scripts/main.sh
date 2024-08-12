#! /bin/sh

set -e

export CURR_DIR=$(pwd)
export NODE_PATH=$(yarn global dir)/node_modules

export PULUMI_SKIP_CHECKPOINTS=true
export PULUMI_EXPERIMENTAL=true
export PULUMI_SKIP_UPDATE_CHECK=true

node --import /scripts/instrumentation.js /scripts/deploy.js
