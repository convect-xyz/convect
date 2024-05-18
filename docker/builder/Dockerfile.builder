FROM node:21-alpine as bundle

WORKDIR /usr/src/app

COPY . .
RUN yarn add esbuild --ignore-workspace-root-check
RUN yarn esbuild ./apps/bundler/src/deploy.ts --external:'esbuild' --bundle --platform=node --target=node10.4 --outfile=/deploy.js
RUN yarn esbuild ./packages/runtime/runtime.js --external:'./pipeline' --bundle --platform=node --target=node10.4 --outfile=/runtime.js
RUN yarn esbuild ./packages/runtime/events-runtime.js --external:'./pipeline' --bundle --platform=node --target=node10.4 --outfile=/events-runtime.js

FROM node:21-alpine

RUN apk update
RUN apk --no-cache add curl tar gzip

WORKDIR /scripts

RUN yarn global add esbuild

COPY ./apps/bundler/scripts .
COPY --from=bundle /runtime.js /deploy.js /events-runtime.js ./

ENTRYPOINT [ "./main.sh" ]
