docker build -t producer:latest -t 730335604495.dkr.ecr.eu-west-1.amazonaws.com/producer .
docker images
docker push 730335604495.dkr.ecr.eu-west-1.amazonaws.com/producer


OR 


aws ecr get-login-password --region eu-west-1 | docker login --username AWS --password-stdin 730335604495.dkr.ecr.eu-west-1.amazonaws.com
