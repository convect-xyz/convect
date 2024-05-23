#! /bin/sh

set -e

cd deployer
pulumi stack init $HANDLER_ID
pulumi up -f
# export CURR_DIR=$(pwd)
# export NODE_PATH=$(yarn global dir)/node_modules

# node $CURR_DIR/deploy.js
