FROM node:21-alpine as bundle

WORKDIR /usr/src/app

COPY . .
RUN yarn add esbuild --ignore-workspace-root-check
RUN yarn esbuild ./apps/bundler/src/get-files.js --bundle --platform=node --target=node10.4 --outfile=/get-files.js
RUN yarn esbuild ./apps/bundler/src/deploy.ts --external:'esbuild' --bundle --platform=node --target=node10.4 --outfile=/deploy.js

FROM node:21-alpine

RUN apk update
RUN apk --no-cache add curl tar gzip

WORKDIR /scripts

COPY ./apps/bundler/scripts .
COPY --from=bundle /get-files.js /deploy.js ./
COPY ./packages/runtime/runtime.js ./

RUN ls

ENTRYPOINT [ "./main.sh" ]
