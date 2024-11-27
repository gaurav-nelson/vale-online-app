# Stage 1: Build stage
FROM node:22-alpine AS build

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm ci --omit=dev

COPY . ./

FROM alpine:3.20

RUN echo http://dl-cdn.alpinelinux.org/alpine/edge/community >>/etc/apk/repositories

# gem install uri is a vulnerability fix
RUN apk update && \
    apk upgrade && \
    apk add --no-cache asciidoctor vale nodejs && \
    rm -rf /var/cache/apk/* && \
    gem install uri

WORKDIR /usr/src/app

COPY --from=build /usr/src/app /usr/src/app

ENV VALE_INI_PATH=/app/config/user.ini
ENV PORT=8080

EXPOSE 8080

CMD [ "node", "server.js" ]
