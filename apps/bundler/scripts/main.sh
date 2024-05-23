#! /bin/sh

set -e

curl -fsSL https://get.pulumi.com | sh

export PATH="${PATH}:/root/.pulumi/bin"
export CURR_DIR=$(pwd)
export NODE_PATH=$(yarn global dir)/node_modules

if [ -n "${PREVIOUS_HANDLER_ID}" ]; then
  echo "Destroying previous handler"
  pulumi destroy -s kayakthedev/convect-v1/$PREVIOUS_HANDLER_ID -f --remove --continue-on-error || true
fi

node /scripts/deploy.js

cd /deployer/apps/deployer
yarn
pulumi stack init kayakthedev/convect-v1/$HANDLER_ID
pulumi up -f
