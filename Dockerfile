FROM node:20-alpine

RUN mkdir /app
WORKDIR /app

COPY package.json ./

RUN npm install --force --only=uat --legacy-peer-deps

COPY . .

RUN npm install -g @nestjs/cli

RUN npm run build

EXPOSE 8081

ENTRYPOINT ["node", "dist/main.js"]