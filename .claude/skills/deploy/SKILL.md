---
name: deploy
description: Deploy to production via docker compose. Pulls latest images and restarts all services. Use when the user wants to deploy, push to prod, or update the running server.
disable-model-invocation: true
---

Guide the user through deploying to production:

1. Remind them that the Docker entrypoint automatically runs `npm run migration:run` before the app starts — no manual migration step needed.

2. Provide the commands to run on the server via SSH:

```bash
docker compose pull
docker compose up -d
```

3. Suggest they verify the deploy with:
```bash
docker compose ps
docker compose logs nestjs-api --tail=50
```

4. If there were database migrations in this deploy, ask them to confirm the migration ran cleanly in the logs (look for `migration:run` output).

5. Remind them Swagger docs are at `PUBLIC_DOMAIN/api/docs` to smoke-test the API.