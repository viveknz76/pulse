FROM node:20-alpine AS base
WORKDIR /app

RUN apk add --no-cache openssl

COPY package.json package-lock.json* ./
RUN npm install

COPY prisma ./prisma
RUN npx prisma generate

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# Entry: run pending migrations then start the server
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]

EXPOSE 4000
