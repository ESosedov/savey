# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

COPY --from=builder /app/dist ./dist

# Копируем datasource.config для миграций
COPY --from=builder /app/datasource.config.ts ./datasource.config.ts

# Копируем package.json для команд миграций
COPY --from=builder /app/package.json ./package.json

EXPOSE 3000

ENV NODE_ENV=production

CMD ["sh", "-c", "npm run migration:run && node dist/src/main"]