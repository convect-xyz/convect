#! /bin/sh

set -e

yarn global add esbuild

export CURR_DIR=$(pwd)
export NODE_PATH=$(yarn global dir)/node_modules

node $CURR_DIR/deploy.js
