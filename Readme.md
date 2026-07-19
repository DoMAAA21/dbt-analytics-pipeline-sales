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
│ (UI)     │      │ (API)    │      │ (transforms)   │
└──────────┘      └──────────┘      └────────────────┘
```

1. **dbt-analytics** transforms raw data into clean, tested analytical models.
2. **server** exposes those models through APIs for consumption.
3. **client** presents insights with dashboards and interactive views.

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
