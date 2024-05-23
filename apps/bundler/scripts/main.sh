#! /bin/sh

set -e


curl -fsSL https://get.pulumi.com | sh
export PATH="${PATH}:/root/.pulumi/bin"
cd /deployer
ls -R
cd /deployer/apps/deployer
pulumi stack init kayakthedev/convect-v1/$HANDLER_ID
pulumi up -f
# export CURR_DIR=$(pwd)
# export NODE_PATH=$(yarn global dir)/node_modules

# node $CURR_DIR/deploy.js
