#! /bin/sh

set -e

mkdir -p $ARCHIVE_DIR
mkdir -p $SRC_DIR
export CURR_DIR=$(pwd)
export ARCHIVE_FILE="$ARCHIVE_DIR/output.tar"


echo $GITHUB_ACCESS_TOKEN
echo $GITHUB_REPO
echo $GITHUB_REF
echo $ARCHIVE_FILE

yarn global add esbuild viem

curl -L  \
  -H "Accept: application/vnd.github+json" \
  -H "Authorization: Bearer $GITHUB_ACCESS_TOKEN" \
  -H "X-GitHub-Api-Version: 2022-11-28" \
  https://api.github.com/repos/$GITHUB_OWNER/$GITHUB_REPO/tarball/$GITHUB_REF -o $ARCHIVE_FILE --fail-with-body 

cd $SRC_DIR

tar -xzvf $ARCHIVE_FILE --strip-components=1

yarn

esbuild $(node $CURR_DIR/get-files.js) --bundle --outdir="$OUT_DIR" --target=node10.4 --format=cjs

export NODE_PATH=$(yarn global dir)/node_modules

node $CURR_DIR/deploy.js
