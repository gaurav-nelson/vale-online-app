FROM alpine:3.20

RUN echo http://dl-cdn.alpinelinux.org/alpine/edge/testing >>/etc/apk/repositories

# gem install uri is a vulnerability fix
RUN apk update && \
    apk upgrade && \
    apk add --no-cache asciidoctor vale nodejs npm && \
    rm -rf /var/cache/apk/* && \
    gem install uri

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm ci --omit=dev

COPY . ./

EXPOSE 8080

CMD [ "node", "server.js" ]
