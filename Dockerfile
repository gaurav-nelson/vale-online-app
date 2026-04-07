# Stage 1: Build stage (Node 24 LTS, Alpine 3.23)
FROM node:24-alpine AS build

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm ci --omit=dev

COPY . ./

# Runtime: same Node as build; Alpine repos already include community (vale)
FROM node:24-alpine

RUN apk update && \
    apk upgrade && \
    apk add --no-cache asciidoctor vale python3 py3-pip && \
    rm -rf /var/cache/apk/* && \
    gem install uri asciidoctor-dita-topic && \
    pip3 install --no-cache-dir --break-system-packages dita-convert dita-cleanup

WORKDIR /usr/src/app

COPY --from=build /usr/src/app /usr/src/app

ENV VALE_INI_PATH=/app/config/user.ini
ENV PORT=8080

EXPOSE 8080

CMD [ "node", "server.js" ]
