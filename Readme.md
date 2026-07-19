# dbt Analytics Pipeline

A showcase project for an end-to-end **dbt analytics pipeline**, split across three repositories that work together from data ingestion to transformation and presentation.

## Repositories

| Repository | Role |
|---|---|
| **client** | Frontend application for exploring and visualizing analytics |
| **server** | Backend API that serves data and orchestrates pipeline access |
| **dbt-analytics** | dbt project for modeling, transforming, and testing analytical data |

## Architecture

```
┌──────────┐      ┌──────────┐      ┌────────────────┐
│  client  │ ───► │  server  │ ───► │ dbt-analytics  │
│ (charts) │      │ (API)    │      │ bronze→silver  │
└──────────┘      └──────────┘      │ →gold marts    │
                                    └────────┬───────┘
                                             │
                                    Postgres OLTP (ecommerce)
```

1. **Postgres OLTP** holds normalized ecommerce data ([`SCHEMA.md`](./SCHEMA.md)).
2. **dbt** builds Bronze → Silver → Gold models ([`ANALYTICS.md`](./ANALYTICS.md)).
3. **server** exposes gold marts through APIs.
4. **client** renders dashboards (revenue, products, cohorts, ops).

## Docs

| Doc | Contents |
|---|---|
| [`SCHEMA.md`](./SCHEMA.md) | Ecommerce ERD / OLTP tables |
| [`ANALYTICS.md`](./ANALYTICS.md) | Medallion layers + chart plan |

## Getting Started

Clone each repository into this workspace (or your preferred layout):

```bash
git clone <client-repo-url> client
git clone <server-repo-url> server
git clone <dbt-analytics-repo-url> dbt-analytics
```

Then follow the setup instructions in each repo’s own README.

## Purpose

This project demonstrates how a modern analytics stack can be organized:

- Clear separation of concerns across UI, API, and data transformation
- Reproducible dbt models and tests
- A full path from warehouse transforms to product-facing analytics
