FROM node:20-slim

WORKDIR /app

# Install OpenSSL for Prisma engine
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci

COPY prisma ./prisma
RUN npx prisma generate

COPY . .
RUN npm run build
RUN npm prune --omit=dev

EXPOSE 8080

CMD ["node", "dist/index.js"]
