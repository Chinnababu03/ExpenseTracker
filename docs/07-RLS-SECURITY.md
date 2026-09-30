# RLS and Security Specification

## Security objective

A user must never be able to read or modify another user's financial data.

## General pattern

Every user-owned table includes user_id where practical.

Enable RLS.

Policy pattern:

USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id)

## Important relationship cases

For child records without a direct user_id, authorization may traverse the parent relationship.

However, keeping user_id on important operational tables can simplify:
- RLS
- indexing
- auditing
- query planning

The duplication of ownership metadata is acceptable when it is deliberately constrained and maintained.

## Required tests

Test separately:
- SELECT
- INSERT
- UPDATE
- DELETE

For:
- own records
- another user's records
- unauthenticated access

## Secrets

Never expose:
- service role key
- database passwords
- private API credentials

Client-visible environment variables must contain only values intended for public exposure.

## Least privilege

Do not grant broad database permissions when narrower access is sufficient.

## Audit

Important financial mutations should be auditable.

## Security review checklist

- RLS enabled?
- policies cover all operations?
- policy expressions use correct ownership?
- child records protected?
- service-role use server-only?
- secrets excluded from Git?
- logs free from sensitive card data?
- full card numbers never stored?
