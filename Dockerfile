FROM node:lts-alpine
WORKDIR /witcher
COPY . .
RUN npm i
ENTRYPOINT ["node", "witcher"]
