# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Stack

NestJS 11 + TypeORM 0.3.26 + PostgreSQL (Neon cloud) + MinIO + Telegram bot + Gemini AI embeddings.

## Commands

```bash
npm run start:dev          # dev server with watch
npm run build              # compile TypeScript
npm run lint               # ESLint with auto-fix
npm run format             # Prettier format

npm run migration:run      # apply pending migrations
npm run migration:revert   # revert last migration
npm run migration:generate # generate migration from entity diff
```

## Database

- Dev and prod both use **Neon PostgreSQL** (cloud) — no local Docker DB needed.
- `synchronize: false` — never use `synchronize: true`, always use migrations.
- `SnakeNamingStrategy` converts all camelCase entity fields to `snake_case` columns automatically.
- Migrations live in `src/migrations/` — run via `typeorm-ts-node-commonjs` pointing at `datasource.config.ts`.
- `datasource.config.ts` auto-switches entity/migration paths: `.ts` in dev, `.js` in prod (dist/).

## Code Style

Prettier: `singleQuote: true`, `trailingComma: 'all'`. ESLint: `@typescript-eslint/no-explicit-any` disabled.

## Architecture Notes

- All API routes require JWT Bearer auth (except auth endpoints). Swagger UI available at `/api/docs`.
- `ValidationPipe` is global with `whitelist: true` and `forbidNonWhitelisted: true`.
- Content types: `link` (REST API), `photo` / `document` (Telegram only). REST endpoints filter to `contentType = 'link'`.
- Storage abstraction: `StorageService` wraps MinIO; prefix `photos/` or `documents/` per content type.
- Embeddings: `EmbeddingService` uses Gemini API — `generateFromText` and `generateFromImage` for semantic search.

## Required Env Vars

```
DB_HOST, DB_PORT, DB_USERNAME, DB_PASSWORD, DB_DATABASE
JWT_SECRET, JWT_EXPIRES_IN, JWT_REFRESH_SECRET, JWT_REFRESH_EXPIRES_IN
GOOGLE_CLIENT_ID
GEMINI_API_KEY
TELEGRAM_BOT_TOKEN, TELEGRAM_WEBHOOK_SECRET
RESEND_API_KEY
MINIO_ENDPOINT, MINIO_PORT, MINIO_USE_SSL, MINIO_ACCESS_KEY, MINIO_SECRET_KEY, MINIO_BUCKET_NAME
IFRAMELY_URL
PUBLIC_DOMAIN
```

## Deployment

Manual deploy via SSH + docker compose on the server:

```bash
docker compose pull
docker compose up -d
```

The Docker entrypoint runs `npm run migration:run` before starting the app. All services (nginx, api, minio, iframely) are defined in `docker-compose.yml`.