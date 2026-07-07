FROM alpine:3.20

RUN apk add --no-cache g++

RUN addgroup -S sandbox && adduser -S sandbox -G sandbox
USER sandbox
WORKDIR /sandbox
