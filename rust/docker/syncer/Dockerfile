FROM --platform=linux/amd64 lukemathwalker/cargo-chef:latest as chef
WORKDIR /app

FROM --platform=linux/amd64 chef AS planner
COPY ./Cargo.toml ./Cargo.lock ./
COPY ./src ./src
RUN cargo chef prepare --bin=syncer

FROM --platform=linux/amd64 chef AS builder
COPY --from=planner /app/recipe.json .
RUN cargo chef cook --release --bin=syncer
COPY . .
RUN cargo build --release --bin=syncer
RUN mv ./target/release/syncer ./app

FROM --platform=linux/amd64 debian:stable-slim AS runtime
WORKDIR /app
COPY --from=builder /app/app /usr/local/bin/
RUN apt-get update && apt install -y openssl ca-certificates
ENTRYPOINT ["/usr/local/bin/app"]
