# sebcel-chocoop-notifications — technical reference for AI

This document describes the `sebcel-chocoop-notifications` component for the benefit of an AI agent
working on a sibling component (e.g. `sebcel-chocoop-app`) that publishes events consumed here.

---

## Role in the ecosystem

`sebcel-chocoop-notifications` is a purely asynchronous, event-driven notification service.
It subscribes to domain events published by other components on the shared EventBridge bus and
delivers user-facing email notifications. It owns no business logic, no database, and no API.

Related repositories:

- `sebcel-chocoop-app` — publishes domain events that this component consumes
- `sebcel-chocoop-infra` — owns and provisions the shared EventBridge bus
- `sebcel-chocoop-architecture` — ADRs, event contracts, diagrams

---

## Technology stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 20 / TypeScript |
| Build | esbuild (bundle) + adm-zip (zip for Lambda) |
| Email delivery | nodemailer over SMTP |
| Secrets | AWS SSM Parameter Store (SecureString) |
| Infrastructure | Terraform >= 1.5, AWS provider ~> 5.0 |
| Deployment | GitHub Actions (CI/CD) |
| Cloud region | eu-central-1 |

Build output: `build/notifications-handler.zip` — single bundled JS file zipped for Lambda.
`@aws-sdk/*` is marked as `external` in esbuild (available in the Node 20 Lambda runtime).
`nodemailer` is bundled.

---

## AWS infrastructure

All resources follow the naming convention: `sebcel-chocoop-<component>-<resource>-<environment>`.

### Lambda function

- Name: `sebcel-chocoop-notifications-function-{env}`
- Runtime: `nodejs20.x`
- Handler: `notifications-handler.handler`
- IAM policies attached:
  - `AWSLambdaBasicExecutionRole` (CloudWatch Logs)
  - Inline policy: `ssm:GetParameter`, `ssm:GetParameters` scoped to
    `arn:aws:ssm:*:*:parameter/sebcel-chocoop-notifications/{env}/smtp/*`

### EventBridge

- Bus: `sebcel-chocoop-infra-bus-{env}` (owned by `sebcel-chocoop-infra`, referenced by name)
- Rule: matches `source = "sebcel-chocoop"` — all events from the application, no detail-type filter at the bus level
- Target: the Lambda function above

### SSM Parameter Store

Two `SecureString` parameters per environment, managed by Terraform with `ignore_changes = [value]`
(Terraform creates the placeholder; real values must be set manually):

```
/sebcel-chocoop-notifications/{env}/smtp/username
/sebcel-chocoop-notifications/{env}/smtp/password
```

---

## Environments

| Environment | Bus | Base URL | Notifications enabled |
|---|---|---|---|
| dev | sebcel-chocoop-infra-bus-dev | localhost:5173 | **false** |
| uat | sebcel-chocoop-infra-bus-uat | uat.drmf9v4p6jnv3.amplifyapp.com | **false** |
| prod | sebcel-chocoop-infra-bus-prod | chocoop.pl | **true** |

SMTP host for all environments: `smtp.wp.pl`, port `587` (STARTTLS).

---

## Lambda environment variables

| Variable | Source | Description |
|---|---|---|
| `NOTIFICATIONS_ENABLED` | Terraform | `"true"` / `"false"` — global on/off toggle |
| `ENVIRONMENT` | Terraform | `dev` / `uat` / `prod` — used to build SSM paths |
| `NOTIFICATION_RECIPIENTS` | Terraform | Comma-separated list of email addresses for broadcast events |
| `SMTP_HOST` | Terraform | SMTP server hostname |
| `SMTP_PORT` | Terraform | SMTP port (default `587`) |
| `SMTP_FROM` | Terraform | Sender address (From header) |
| `BASE_URL` | Terraform | Frontend hostname used in deep links, without protocol |
| `smtp/username` | SSM (runtime fetch) | SMTP login, fetched with `WithDecryption: true` |
| `smtp/password` | SSM (runtime fetch) | SMTP password, fetched with `WithDecryption: true` |

---

## Handler execution flow

```
EventBridge invokes Lambda
  │
  ├─ NOTIFICATIONS_ENABLED === "false"  →  log + return (no email)
  │
  ├─ env var validation (ENVIRONMENT, NOTIFICATION_RECIPIENTS, SMTP_HOST, SMTP_FROM, BASE_URL missing)
  │    →  log error + return
  │
  ├─ buildEmail(detail-type, detail, baseUrl)
  │    ├─ WorkRequestCreated      →  Email { subject, body }            (no recipient)
  │    ├─ WorkRequestCompleted    →  Email { subject, body }            (no recipient)
  │    ├─ ReactionAdded           →  Email { subject, body }            (no recipient)
  │    ├─ ActivityReminderNeeded  →  Email { subject, body, recipient } (targeted)
  │    └─ anything else           →  null  →  log + return (silently ignored)
  │
  ├─ resolve recipients
  │    ├─ email.recipient present  →  [ email.recipient ]   (single targeted address)
  │    └─ email.recipient absent   →  NOTIFICATION_RECIPIENTS split by comma
  │
  ├─ fetch SMTP credentials from SSM (parallel GetParameter calls)
  │
  └─ send via nodemailer (SMTP, STARTTLS on port 587 / SSL on 465)
```

---

## Consumed event types

The EventBridge rule matches `source = "sebcel-chocoop"`. Detail-type filtering is done in code.

### WorkRequestCreated

Published by: `domain-events-function` on INSERT into WorkRequest table.

```json
{
  "detail-type": "WorkRequestCreated",
  "source": "sebcel-chocoop",
  "detail": {
    "workRequestId": "string (UUID)",
    "createdBy": "string (Cognito sub)",
    "createdByName": "string (Cognito nickname)",
    "createdDate": "string (ISO date, e.g. 2026-07-02)",
    "type": "string (work request category)",
    "exp": "string (number as string)",
    "urgency": "number",
    "urgencyDescription": "string (human-readable urgency label, e.g. 'W ciągu paru dni')"
  }
}
```

Email: broadcast to `NOTIFICATION_RECIPIENTS`.
Subject: `Chores Cooperative - {type} do wykonania {urgencyDescription*} za {exp} exp`
*first letter lowercased for mid-sentence context.

Deep link: `https://{BASE_URL}/WorkRequestDetails/{workRequestId}`

---

### WorkRequestCompleted

Published by: `domain-events-function` on INSERT into Activity table where `source = "promotion"`.

```json
{
  "detail-type": "WorkRequestCompleted",
  "source": "sebcel-chocoop",
  "detail": {
    "activityId": "string (UUID)",
    "workRequestId": "string (UUID)",
    "completedBy": "string (Cognito sub)",
    "completedByName": "string (Cognito nickname)",
    "type": "string (activity/work request category)",
    "exp": "string (number as string)",
    "date": "string (ISO date)"
  }
}
```

Email: broadcast to `NOTIFICATION_RECIPIENTS`.
Subject: `Chores Cooperative - {completedByName} wykonał zlecenie na {type} za {exp} exp`

Deep link: `https://{BASE_URL}/WorkRequestDetails/{workRequestId}`

---

### ReactionAdded

Published by: `domain-events-function` on INSERT into Reaction table.
The function fetches the parent Activity from DynamoDB to populate `activityType`, `activityUser`, `activityUserName`.

```json
{
  "detail-type": "ReactionAdded",
  "source": "sebcel-chocoop",
  "detail": {
    "reactionId": "string (UUID)",
    "activityId": "string (UUID)",
    "activityType": "string (activity category)",
    "activityUser": "string (Cognito sub of activity owner)",
    "activityUserName": "string (Cognito nickname of activity owner)",
    "reactionUser": "string (Cognito sub of person who reacted)",
    "reactionUserName": "string (Cognito nickname of person who reacted)",
    "reaction": "string (reaction value, e.g. emoji or label)"
  }
}
```

Email: broadcast to `NOTIFICATION_RECIPIENTS`.
Subject: `Chores Cooperative - {activityUserName} otrzymuje {reaction} za {activityType} od {reactionUserName}`

Deep link: `https://{BASE_URL}/ActivityDetails/{activityId}`

---

### ActivityReminderNeeded

Published by: `activity-reminder-function` on a scheduled EventBridge rule at 19:00 UTC daily.
One event per user who has logged zero activities today (Polish timezone: Europe/Warsaw).

```json
{
  "detail-type": "ActivityReminderNeeded",
  "source": "sebcel-chocoop",
  "detail": {
    "userId": "string (Cognito sub)",
    "userEmail": "string (Cognito email attribute)",
    "userName": "string (Cognito nickname attribute)",
    "date": "string (ISO date in Polish timezone, e.g. 2026-07-02)"
  }
}
```

Email: sent **only** to `detail.userEmail` — NOT to the distribution list. One email per inactive user.
Subject: `Chores Cooperative - nie masz dzisiaj jeszcze zarejestrowanych żadnych zasług`

Deep link: `https://{BASE_URL}` (homepage)

---

### ActivityCreated

Published by: `domain-events-function` on INSERT into Activity table where `source = "direct"`.
**This event type is currently ignored** — the handler returns without sending any email.
If broadcast notification for manually logged activities is desired in the future, add a case to `buildEmail()`.

---

## Data type notes

- `exp` arrives as a **string** in all events (DynamoDB `N` type serialized as string). Example: `"10"`.
- `urgency` arrives as a **number** but is not used in emails — `urgencyDescription` (string) is used instead.
- Nicknames (`createdByName`, `completedByName`, etc.) fall back to the raw Cognito sub if the
  `nickname` attribute is absent or the Cognito lookup fails in the publishing function.

---

## Adding a new event type

1. Define an interface for the `detail` shape in `src/handlers/notifications-handler.ts`.
2. Add a `build*Email()` function returning `Email` (`{ subject, body, recipient? }`).
   - Set `recipient` only if the email should go to a specific address from the event detail.
   - Omit `recipient` for broadcast emails (goes to `NOTIFICATION_RECIPIENTS`).
3. Add a `case` to the `buildEmail()` switch statement.
4. No Terraform changes needed unless a new env var or IAM permission is required.

---

## Recipient model

| Scenario | Recipients |
|---|---|
| `email.recipient` is set | Only that single address |
| `email.recipient` is absent | All addresses in `NOTIFICATION_RECIPIENTS` (comma-separated) |

Production `NOTIFICATION_RECIPIENTS`: household members' email addresses.
`ActivityReminderNeeded` bypasses this list entirely and targets only the inactive user.
