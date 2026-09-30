# Deployment and CI/CD

## Environments

- local
- preview
- production

## Git workflow

feature branch
→ pull request
→ lint
→ typecheck
→ tests
→ build
→ review
→ merge

## Database changes

All schema changes must use migrations.

Never rely on manual production SQL as the normal deployment process.

## Environment variables

Local secrets:
.env.local

Production secrets:
deployment platform secret manager/environment configuration.

Never commit secrets.

## CI checks

- formatting/lint
- TypeScript typecheck
- unit tests
- integration tests where practical
- build
- migration verification

## Deployment

Vercel can deploy the Next.js application.

Supabase hosts the managed database/auth/storage components.

## Rollback

Application rollback and database rollback are different problems.

Prefer forward-compatible migrations:
1. add new structure
2. deploy code supporting both states
3. migrate data
4. remove old structure later
