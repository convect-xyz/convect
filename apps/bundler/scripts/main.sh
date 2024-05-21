#! /bin/sh

set -e

export CURR_DIR=$(pwd)
export NODE_PATH=$(yarn global dir)/node_modules

node $CURR_DIR/deploy.js
