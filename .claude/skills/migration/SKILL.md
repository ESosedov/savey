---
name: migration
description: Generate, review, and apply TypeORM migrations. Use when entities have changed and a migration is needed, or when asked to run/revert migrations.
disable-model-invocation: true
---

## Generating a migration

When entity fields have changed, generate a migration from the diff:

```bash
npm run migration:generate
```

This creates a timestamped file in `src/migrations/`. **Always review the generated SQL** before running — check for:
- Unexpected DROP COLUMN or DROP TABLE statements
- Missing DEFAULT values on NOT NULL columns being added to existing tables
- Column renames that TypeORM may generate as DROP + ADD (data loss risk)

## Applying migrations

```bash
npm run migration:run
```

Uses `datasource.config.ts` which connects to the Neon PostgreSQL instance from env vars.

## Reverting

```bash
npm run migration:revert
```

Reverts only the last applied migration.

## Important notes

- `synchronize: false` in TypeORM config — never enable it, always use migrations.
- `SnakeNamingStrategy` is active: camelCase entity fields become snake_case columns automatically. Migration-generated SQL will use snake_case column names.
- In production, migrations run automatically via the Docker entrypoint before the app starts.
- Migration files in `src/migrations/*.ts` are compiled to `dist/migrations/*.js` — the app in prod runs the compiled JS versions.