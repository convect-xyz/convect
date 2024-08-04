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
COPY packages/lib packages/lib

RUN yarn

# Add monorepo (TODO: prune just bundler package)
COPY . .

WORKDIR /usr/src/app

RUN yarn esbuild ./apps/bundler/src/deploy.ts --external:'esbuild' --external:'@pulumi/pulumi' --bundle --platform=node --target=node10.4 --outfile=/deploy.js
RUN yarn esbuild ./apps/bundler/src/instrumentation.ts --bundle --platform=node --target=node10.4 --outfile=/instrumentation.js
RUN yarn esbuild ./packages/runtime/runtime.ts --external:'./pipeline' --bundle --platform=node --target=node10.4 --outfile=/runtime.js


FROM node:21-alpine

RUN yarn global add esbuild @pulumi/pulumi @sentry/profiling-node
RUN apk update
RUN apk --no-cache add curl
WORKDIR /scripts
COPY --from=bundle /runtime.js /deploy.js instrumentation.js ./
WORKDIR /
COPY ./apps/bundler/scripts/main.sh .

ENTRYPOINT [ "./main.sh" ]
