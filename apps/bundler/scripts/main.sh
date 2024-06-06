#! /bin/sh

set -e

curl -fsSL https://get.pulumi.com | sh

export PATH="${PATH}:/root/.pulumi/bin"
export CURR_DIR=$(pwd)
export NODE_PATH=$(yarn global dir)/node_modules

node /scripts/deploy.js
