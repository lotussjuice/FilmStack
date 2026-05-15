FROM alpine:latest

ARG PB_VERSION=0.25.3

RUN apk add --no-cache \
    unzip \
    ca-certificates \
    wget

# Download and install PocketBase
RUN wget https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/pocketbase_${PB_VERSION}_linux_amd64.zip \
    && unzip pocketbase_${PB_VERSION}_linux_amd64.zip \
    && mv pocketbase /usr/local/bin/pocketbase \
    && rm pocketbase_${PB_VERSION}_linux_amd64.zip

EXPOSE 8090

# Start PocketBase
CMD ["/usr/local/bin/pocketbase", "serve", "--http=0.0.0.0:8090", "--dir=/pb_data", "--migrationsDir=/pb_migrations", "--hooksDir=/pb_hooks"]
