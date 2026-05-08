```md id="notif-readme"
# sebcel-chocoop-notifications

Notifications service for the Chores Cooperative ecosystem.

This component consumes domain events from the shared EventBridge bus and produces user-facing notifications.

The service is intentionally asynchronous and event-driven.

---

## Purpose

Main responsibilities:

- consume domain events from EventBridge
- generate user notifications
- send notifications through external channels
- decouple notification delivery from the main application

---

## Current Scope

Currently implemented:

- AWS Lambda notification consumer
- EventBridge integration
- CloudWatch logging

Planned:

- AWS SES integration
- email notifications
- push notifications
- in-app notifications
- notification preferences
- retry and dead-letter handling

---

## Non-Goals

This repository does NOT contain:

- shared infrastructure
- EventBridge ownership
- frontend code
- application database
- business domain logic
- Kimbalontek mood calculation

Shared infrastructure is managed in:

    sebcel-chocoop-infra

---

## Architecture Role

The service acts as an asynchronous consumer in the event-driven architecture.

Current flow:

    EventBridge
        →
    Notifications Lambda
        →
    CloudWatch Logs

Planned flow:

    EventBridge
        →
    Notifications Lambda
        →
    SES / Push / In-App
        →
    Users

---

## Repository Structure

    .
    ├── README.md
    ├── docs/
    ├── scripts/
    ├── build/
    │
    ├── src/
    │   └── handlers/
    │       └── notifications-handler.ts
    │
    ├── terraform/
    │   ├── environments/
    │   │   ├── dev/
    │   │   └── prod/
    │   │
    │   ├── modules/
    │   │   └── notifications-service/
    │   │
    │   └── root/
    │
    ├── package.json
    ├── tsconfig.json
    │
    └── .github/
        └── workflows/

---

## Runtime Architecture

The service does not own the EventBridge bus.

Instead, it:

- references the shared bus
- subscribes to selected events
- processes events asynchronously

Shared EventBridge ownership belongs to:

    sebcel-chocoop-infra

---

## Environments

### Development

Shared development environment.

Characteristics:

- deployed from non-main branches
- unstable by design
- used for integration testing and experiments

Example resource names:

    sebcel-chocoop-notifications-function-dev
    sebcel-chocoop-notifications-rule-dev

---

### Production

Stable production environment.

Characteristics:

- deployed only from `main`
- intended for stable releases

Example resource names:

    sebcel-chocoop-notifications-function-prod
    sebcel-chocoop-notifications-rule-prod

---

## Naming Convention

AWS resources follow the format:

    sebcel-chocoop-<component>-<resource>-<environment>

Examples:

    sebcel-chocoop-notifications-function-dev
    sebcel-chocoop-notifications-role-prod

---

## Tagging Convention

All AWS resources must contain the following tags:

| Tag | Purpose |
|------|------|
| Name | Human-readable resource name |
| application | System identifier |
| component | Logical component owner |
| environment | Deployment environment |
| owner | Resource owner |
| managed-by | Infrastructure management tool |

Example:

    Name = sebcel-chocoop-notifications-function-dev
    application = sebcel-chocoop
    component = notifications
    environment = dev
    owner = Sebastian.Celejewski@wp.pl
    managed-by = terraform

---

## Deployment Model

### Development

All non-main branches deploy automatically to the shared DEV environment.

### Production

Only the `main` branch may deploy to PROD.

Deployments are executed using GitHub Actions.

---

## Build Strategy

Lambda functions are implemented using:

- Node.js
- TypeScript
- esbuild

Build artifacts are generated into:

    build/

---

## Event Processing

The notifications service consumes events from the shared EventBridge bus.

Current processing behavior:

- receive event
- log event to CloudWatch

Future processing behavior:

- generate notification payload
- select delivery channels
- send notifications
- handle retries and failures

---

## Related Repositories

    sebcel-chocoop-app
    sebcel-chocoop-infra
    sebcel-chocoop-kimbalontek
    sebcel-chocoop-architecture

---

## Architecture Documentation

Architecture documentation, diagrams, ADRs, and event contracts are stored in:

    sebcel-chocoop-architecture
```
