FROM node:21-alpine as prune-deployer
COPY . .
RUN yarn global add turbo
RUN turbo prune deployer --docker

FROM node:21-alpine as bundle
COPY . .
WORKDIR /usr/src/app

RUN yarn add esbuild --ignore-workspace-root-check
RUN yarn esbuild ./apps/bundler/src/deploy.ts --external:'esbuild' --bundle --platform=node --target=node10.4 --outfile=/deploy.js
RUN yarn esbuild ./packages/runtime/runtime.ts --external:'./pipeline' --bundle --platform=node --target=node10.4 --outfile=/runtime.js
RUN yarn esbuild ./packages/runtime/events-runtime.js --external:'./pipeline' --bundle --platform=node --target=node10.4 --outfile=/events-runtime.js

FROM node:21-alpine

RUN curl -fsSL https://get.pulumi.com | sh
ENV PATH="${PATH}:/root/.pulumi/bin"

RUN apk update
RUN apk --no-cache add curl
WORKDIR /deployer
COPY --from=prune-deployer /out .
WORKDIR /scripts
RUN yarn global add esbuild
COPY --from=bundle /runtime.js /deploy.js /events-runtime.js ./
WORKDIR /
COPY ./apps/bundler/scripts/main.sh .

ENTRYPOINT [ "./main.sh" ]
