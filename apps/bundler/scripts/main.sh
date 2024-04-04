#! /bin/sh

set -e

mkdir -p $ARCHIVE_DIR
mkdir -p $SRC_DIR
CURR_DIR=$(pwd)
ARCHIVE_FILE="$ARCHIVE_DIR/output.tar"

echo $GITHUB_ACCESS_TOKEN
echo $GITHUB_REPO
echo $GITHUB_REF
echo $ARCHIVE_FILE

curl -L  \
  -H "Accept: application/vnd.github+json" \
  -H "Authorization: Bearer $GITHUB_ACCESS_TOKEN" \
  -H "X-GitHub-Api-Version: 2022-11-28" \
  https://api.github.com/repos/$GITHUB_OWNER/$GITHUB_REPO/tarball/$GITHUB_REF -o $ARCHIVE_FILE --fail-with-body 

cd $SRC_DIR

tar -xzvf $ARCHIVE_FILE --strip-components=1

yarn install

cd $CURR_DIR

node bundle.js
