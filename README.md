aws ecr get-login-password --region eu-west-1 | docker login --username AWS --password-stdin 730335604495.dkr.ecr.eu-west-1.amazonaws.com


DOCKER_BUILDKIT=1 docker build -t 730335604495.dkr.ecr.eu-west-1.amazonaws.com/syncer:latest . -f ./rust/docker/syncer/Dockerfile.syncer

DOCKER_BUILDKIT=1 docker build -t 730335604495.dkr.ecr.eu-west-1.amazonaws.com/builder:latest .

BIN=orchestrator sh ./rust/scripts/build.sh
BIN=log-fetcher sh ./rust/scripts/build.sh
