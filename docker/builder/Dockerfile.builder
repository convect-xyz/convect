FROM node:21-alpine as bundle

RUN yarn global add turbo

# Workspace root packages
COPY package.json package.json
COPY yarn.lock yarn.lock

# Add bundler deps
COPY apps/bundler/package.json apps/bundler/package.json
COPY apps/bundler/yarn.lock apps/bundler/yarn.lock

# Add workspace package deps
COPY packages/eslint-config packages/eslint-config
COPY packages/typescript-config packages/typescript-config

RUN yarn

# Add source code and prune deployer package only
COPY . .
RUN turbo prune deployer

WORKDIR /usr/src/app

RUN yarn esbuild ./apps/bundler/src/deploy.ts --external:'esbuild' --bundle --platform=node --target=node10.4 --outfile=/deploy.js
RUN yarn esbuild ./packages/runtime/runtime.ts --external:'./pipeline' --bundle --platform=node --target=node10.4 --outfile=/runtime.js
RUN yarn esbuild ./packages/runtime/events-runtime.js --external:'./pipeline' --bundle --platform=node --target=node10.4 --outfile=/events-runtime.js

FROM node:21-alpine

RUN yarn global add esbuild

RUN apk update
RUN apk --no-cache add curl

WORKDIR /deployer
COPY --from=bundle out .
WORKDIR /deployer/apps/deployer
RUN yarn
WORKDIR /scripts
COPY --from=bundle /runtime.js /deploy.js /events-runtime.js ./
WORKDIR /
COPY ./apps/bundler/scripts/main.sh .

ENTRYPOINT [ "./main.sh" ]
