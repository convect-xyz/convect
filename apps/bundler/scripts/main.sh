#! /bin/sh

set -e

curl -fsSL https://get.pulumi.com | sh

export CURR_DIR=$(pwd)

node /scripts/deploy.js
