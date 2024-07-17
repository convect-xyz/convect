#! /bin/sh

set -e

curl -fsSL https://get.pulumi.com | sh

export PATH="${PATH}:/root/.pulumi/bin"
export CURR_DIR=$(pwd)
export NODE_PATH=$(yarn global dir)/node_modules

export PULUMI_SKIP_CHECKPOINTS=true
export PULUMI_EXPERIMENTAL=true
export PULUMI_SKIP_UPDATE_CHECK=true

node /scripts/deploy.js
