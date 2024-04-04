FROM node:21-alpine as bundle

WORKDIR /usr/src/app

RUN npm install -g esbuild
COPY . .
RUN esbuild ./apps/bundler/src/bundle.js --bundle --platform=node --target=node10.4 --outfile=/bundle.js

FROM node:21-alpine

RUN apk update
RUN apk --no-cache add curl tar gzip

WORKDIR /scripts

COPY ./apps/bundler/scripts .
COPY --from=bundle /bundle.js .

ENTRYPOINT [ "./main.sh" ]
