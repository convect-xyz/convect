#! /bin/sh

set -e

curl -fsSL https://get.pulumi.com | sh

export PATH="${PATH}:/root/.pulumi/bin"
export CURR_DIR=$(pwd)
export NODE_PATH=$(yarn global dir)/node_modules

if [ -n "${MODE}" ] && [ "${MODE}" != "update" ]; then
  echo "Destroying previous handler [IF EXISTS]"
  pulumi destroy -s kayakthedev/convect-v1/$HANDLER_ID -f --remove || true
fi

if [ -n "${MODE}" ] && [ "${MODE}" != "destroy" ]; then
  node /scripts/deploy.js

  cd /deployer/apps/deployer
  yarn

  if [ -n "${MODE}" ] && [ "${MODE}" == "init" ]; then
    pulumi stack init kayakthedev/convect-v1/$HANDLER_ID
  else 
    pulumi stack select kayakthedev/convect-v1/$HANDLER_ID
  fi

  pulumi up -f
fi
