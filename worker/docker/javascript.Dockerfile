FROM node:20-alpine

RUN addgroup -S sandbox && adduser -S sandbox -G sandbox
USER sandbox
WORKDIR /sandbox
