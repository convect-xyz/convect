cd rust

cargo lambda build --output-format zip --release --bin=$BIN
aws s3api put-object --bucket ingest-functions --key $BIN/$GITHUB_SHA.zip --body "./target/lambda/$BIN/bootstrap.zip"
