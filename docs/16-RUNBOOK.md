# Operations Runbook

## Deployment failure

1. inspect CI
2. inspect deployment logs
3. identify application vs database failure
4. rollback application if safe
5. never blindly rollback database migrations

## Import failure

1. inspect import status
2. inspect rejected rows
3. identify parser/validation/source issue
4. retry only if operation is idempotent
5. preserve failed import metadata

## Duplicate import

1. identify import ID
2. inspect fingerprint/external IDs
3. determine whether duplicates reached core tables
4. use safe correction procedure
5. add regression test

## RLS incident

Treat as high severity.

1. disable affected functionality if necessary
2. reproduce with two test users
3. inspect policy
4. inspect grants
5. patch migration
6. run security test suite
7. deploy

## Database migration incident

1. stop dependent deployments
2. inspect migration state
3. determine whether forward fix is safer than rollback
4. preserve data
5. apply controlled correction
