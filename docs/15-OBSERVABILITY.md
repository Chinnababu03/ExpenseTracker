# Observability

## Initial tools

- application logs
- database logs
- deployment logs
- CI logs

## Important pipeline metrics

- import duration
- rows processed
- rows accepted
- rows rejected
- duplicate count
- failure count
- retry count

## Application metrics

- request latency
- error rate
- database errors
- authentication failures
- failed imports

## Logging rules

Do not log:
- passwords
- access tokens
- service keys
- full card numbers
- unnecessary financial details

Prefer structured logs.

## Future

When complexity grows:
- centralized logging
- error tracking
- metrics
- tracing
- pipeline dashboards

Do not introduce a full observability platform prematurely.
