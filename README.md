aws ecr get-login-password --region eu-west-1 | docker login --username AWS --password-stdin 730335604495.dkr.ecr.eu-west-1.amazonaws.com

DOCKER_BUILDKIT=1 docker build -t 730335604495.dkr.ecr.eu-west-1.amazonaws.com/syncer:latest . -f ./docker/syncer/Dockerfile.syncer
DOCKER_BUILDKIT=1 docker build -t 730335604495.dkr.ecr.eu-west-1.amazonaws.com/builder:latest . -f ./docker/builder/Dockerfile.builder

docker push 730335604495.dkr.ecr.eu-west-1.amazonaws.com/builder:latest
docker push 730335604495.dkr.ecr.eu-west-1.amazonaws.com/syncer:latest

BIN=orchestrator sh ./rust/scripts/build.sh
BIN=log-fetcher sh ./rust/scripts/build.sh


INSERT INTO public.web_producer ("altId","pollingUrl","wsUrl","userId","serviceArn","topicArn",name) VALUES
	 ('blast','https://rpc.blast.io','https://rpc.blast.io',NULL,'arn:aws:ecs:eu-west-1:730335604495:cluster/mainnet','arn:aws:sns:eu-west-1:730335604495:blast','Blast');
