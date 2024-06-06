#! /bin/sh

set -e

curl -fsSL https://get.pulumi.com | sh

node /scripts/deploy.js
