# ExpenseFlow — Data Model

## Core entities

profiles
accounts
categories
bills
bill_occurrences
payments
transactions
credit_cards
credit_card_statements
credit_card_transactions
imports
import_rows
audit_logs

## Relationships

profiles 1→N accounts
profiles 1→N categories
profiles 1→N bills
bills 1→N bill_occurrences
bill_occurrences 1→N payments
accounts 1→N payments
accounts 1→N transactions
profiles 1→N transactions
credit_cards 1→1/N accounts
credit_cards 1→N credit_card_statements
credit_card_statements 1→N credit_card_transactions
profiles 1→N imports
imports 1→N import_rows

## Why bills are separated from occurrences

A bill is a recurring obligation definition.

An occurrence is one period's actual obligation.

Example:

Bill:
Rent, monthly, ₹25,000, due day 5.

Occurrence:
September 2026, due September 5, ₹25,000, paid September 4.

This avoids copying the definition into every month and gives historical periods their own state.

## Why payments are separate

A bill can have:
- one payment
- multiple partial payments
- payment from a specific account
- payment reference

Therefore payment is its own event/entity.

## Why transactions are separate

A transaction represents a financial event and is not synonymous with a bill.

Example:
- grocery purchase
- salary
- ATM withdrawal
- card purchase

## Credit-card model

Card metadata and statement snapshots are separate from individual transactions.

This permits statement-level analytics and transaction-level analysis.
