# ITSM Helpdesk

A full-stack IT helpdesk and customer-support ticketing system built with React, TypeScript, Node.js, Express, and PostgreSQL.

Customers can submit support requests and chat with support staff in real time. Agents manage a prioritised ticket queue with automated assignment and SLA tracking, while administrators oversee users, system activity, and analytics.

## Screenshots

### Signup

![ITSM Helpdesk Signup](docs/screenshots/signup.png)

### Customer Dashboard

![Customer Dashboard](docs/screenshots/customer-dashboard.png)

### Agent Dashboard

![Agent Dashboard](docs/screenshots/agent-dashboard.png)

### Admin Dashboard

![Admin Dashboard](docs/screenshots/admin-dashboard.png)

## Table of Contents

- [Features](#features)
- [Technologies](#technologies)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Local Setup](#local-setup)
- [Demo Accounts](#demo-accounts)
- [Available Scripts](#available-scripts)
- [Testing](#testing)
- [API Reference](#api-reference)
- [Real-Time Events](#real-time-events)
- [Configuration](#configuration)
- [Deployment](#deployment)
- [Design Decisions and Future Improvements](#design-decisions-and-future-improvements)
- [Troubleshooting](#troubleshooting)
- [License](#license)

## Features

| Area                            | Description                                                                                                                                                                |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Ticket Management**           | Create, assign, prioritise, track, resolve, close, and reopen support tickets through a controlled status workflow.                                                        |
| **Status State Machine**        | Enforces legal transitions between `OPEN`, `IN_PROGRESS`, `WAITING_ON_CUSTOMER`, `RESOLVED`, and `CLOSED`. The `CLOSED` state is terminal.                                 |
| **Automated Ticket Routing**    | Assigns tickets using category, priority, agent skills, and workload. Supports least-active and round-robin strategies.                                                    |
| **Real-Time Collaboration**     | Socket.IO powers live messaging, typing indicators, notifications, and immediate ticket queue and dashboard updates.                                                       |
| **Analytics Dashboard**         | Tracks average resolution time, first-response time, SLA compliance, ticket volume, status, priority, category, and agent performance.                                     |
| **Audit Trail**                 | Records ticket creation, status changes, assignments, priority changes, and internal notes. Database triggers prevent updates, deletions, and truncation of audit records. |
| **Priority and SLA Management** | Supports `LOW`, `MEDIUM`, `HIGH`, and `CRITICAL` priorities with resolution targets of 72, 24, 8, and 4 hours, respectively.                                               |
| **Role-Based Access Control**   | Customers access their own tickets, agents manage support queues, and administrators manage users and access the global audit stream.                                      |
| **Internal Notes**              | Staff can exchange internal notes that remain hidden from customers.                                                                                                       |
| **Notifications**               | Provides an in-app notification inbox for assignments, ticket status changes, and new messages.                                                                            |
| **Authentication and Security** | Uses password hashing, HTTP-only session cookies, input validation, rate limiting, and role-based permissions.                                                             |
| **Database Integrity**          | Uses PostgreSQL constraints, foreign keys, indexes, and triggers to enforce important data rules at database level.                                                        |

## Technologies

| Layer             | Technologies                                                                            |
| ----------------- | --------------------------------------------------------------------------------------- |
| Frontend          | React 19, TypeScript, Vite, React Router, TanStack Query, Tailwind CSS v4, Lucide React |
| Backend           | Node.js, Express 5, Socket.IO, Zod, Pino, Helmet, express-rate-limit                    |
| Database          | PostgreSQL, Prisma ORM                                                                  |
| Authentication    | bcrypt password hashing, JWT-signed session tokens, HTTP-only cookies                   |
| Testing           | Vitest, unit tests, integration tests against PostgreSQL                                |
| Development Tools | npm workspaces, Docker Compose, TypeScript                                              |

## Architecture

The application separates the frontend, backend, and database into distinct layers.

```text
┌───────────────────────────────┐
│          Frontend             │
│                               │
│ React + TypeScript + Vite     │
│ TanStack Query                │
│ React Router                  │
└───────────────┬───────────────┘
                │
         REST API + Socket.IO
                │
┌───────────────▼───────────────┐
│           Backend             │
│                               │
│ Node.js + Express             │
│ Authentication and Validation│
│ Controllers and Services      │
│ Ticket Routing and SLA Rules  │
│ Audit Logging and Events      │
└───────────────┬───────────────┘
                │
             Prisma ORM
                │
┌───────────────▼───────────────┐
│          PostgreSQL           │
│                               │
│ Tables and Relationships      │
│ Indexes and Constraints       │
│ Database Triggers             │
└───────────────────────────────┘
```

### Request Lifecycle

1. **Route and controller:** Routes direct requests to controllers, which validate incoming data using Zod.
2. **Service layer:** Services execute business rules, including ticket transitions, assignment, SLA calculations, and permissions.
3. **Database transaction:** Each ticket command performs related database changes in a transaction. Ticket updates, audit entries, and notifications are committed together.
4. **Event publication:** Domain events are published after the transaction commits, preventing clients from receiving updates for rolled-back changes.
5. **Real-time delivery:** The Socket.IO gateway sends events to authorised users and rooms. The frontend updates its cached data through TanStack Query.

### Ticket Status State Machine

The permitted ticket statuses are:

`OPEN → IN_PROGRESS → WAITING_ON_CUSTOMER → RESOLVED → CLOSED`

The system also supports these legal transitions:

- `WAITING_ON_CUSTOMER → IN_PROGRESS`
- `RESOLVED → IN_PROGRESS` when a ticket is reopened.

The state machine is enforced at two levels:

- **Application layer:** Defines permitted transitions and role permissions in `ticket.state-machine.ts`.
- **Database layer:** Uses a transition table, PostgreSQL triggers, and constraints to protect data integrity.

Invalid transitions return a suitable error. Conditional updates also help prevent conflicting changes when multiple agents act on the same ticket.

### Automated Ticket Routing

The routing engine assigns tickets according to ordered rules.

| Rule                     | Condition                  | Assignment Strategy                     |
| ------------------------ | -------------------------- | --------------------------------------- |
| `critical-least-active`  | Priority is `CRITICAL`     | Least-loaded agent with matching skills |
| `security-least-active`  | Category is `SECURITY`     | Least-loaded security specialist        |
| `specialist-round-robin` | Another supported category | Rotate between matching specialists     |
| `default`                | No earlier rule matches    | Use the configured assignment strategy  |

Workload is weighted by ticket priority:

- `LOW`: 1
- `MEDIUM`: 2
- `HIGH`: 3
- `CRITICAL`: 5

If no suitable specialist is available, the system falls back to the wider agent pool so tickets can still be assigned.

### Analytics and Database Indexing

Analytics are calculated in PostgreSQL using SQL queries rather than loading large datasets into Node.js.

Important indexes support:

- Staff queues filtered by status and priority.
- Agent workload and assigned-ticket views.
- Customer ticket history.
- Category-based filtering and reporting.
- Ticket volume and resolution-time calculations.
- SLA deadline checks.
- Audit history and notification inboxes.

### Real-Time Rooms and Privacy

Socket.IO rooms restrict which events users can receive.

| Room                | Purpose                                         |
| ------------------- | ----------------------------------------------- |
| `staff`             | Live staff queue and dashboard updates          |
| `user:<id>`         | Private notifications and user-specific updates |
| `ticket:<id>`       | Public ticket conversations                     |
| `ticket:<id>:staff` | Staff-only internal notes and audit activity    |

The server checks permissions before allowing a user to join a ticket room. Internal notes are sent only to authorised staff.

### Security

The application incorporates several security measures:

- HTTP-only session cookies with `SameSite=Lax` and `Secure` in production.
- Password hashing using bcrypt.
- Zod validation for incoming data.
- Rate limiting across the API, with stricter limits for authentication endpoints.
- Role-based access control for customers, agents, and administrators.
- Generic login errors that avoid revealing whether an email address exists.
- Consistent API error responses.
- Ticket access restrictions that avoid revealing whether another customer's ticket exists.
- Environment-based configuration for secrets and database credentials.
- Protection against unauthorised changes to ticket status and audit records.

## Project Structure

```text
itsm-helpdesk/
├── docker-compose.yml
├── package.json
├── package-lock.json
├── README.md
├── scripts/
│   └── package.sh
├── docs/
│   └── screenshots/
│       ├── signup.png
│       ├── customer-dashboard.png
│       ├── agent-dashboard.png
│       └── admin-dashboard.png
├── server/
│   ├── prisma/
│   │   ├── schema.prisma
│   │   ├── migrations/
│   │   └── seed.ts
│   ├── src/
│   │   ├── config/
│   │   ├── domain/
│   │   ├── events/
│   │   ├── lib/
│   │   ├── middleware/
│   │   ├── modules/
│   │   │   ├── auth/
│   │   │   ├── users/
│   │   │   ├── notifications/
│   │   │   ├── audit/
│   │   │   ├── analytics/
│   │   │   ├── health/
│   │   │   ├── messages/
│   │   │   ├── routing/
│   │   │   └── tickets/
│   │   ├── realtime/
│   │   ├── routes/
│   │   ├── app.ts
│   │   └── server.ts
│   └── tests/
│       ├── unit/
│       └── integration/
└── client/
    └── src/
        ├── api/
        ├── components/
        ├── context/
        ├── hooks/
        ├── lib/
        ├── pages/
        └── types/
```

### Key Directories

| Path                     | Purpose                                                                                  |
| ------------------------ | ---------------------------------------------------------------------------------------- |
| `client/src/api/`        | Typed API functions for communicating with the backend                                   |
| `client/src/components/` | Reusable UI components, layouts, ticket components, and analytics components             |
| `client/src/context/`    | Authentication, Socket.IO, notifications, and live synchronisation                       |
| `client/src/hooks/`      | Data fetching, ticket rooms, live updates, and reusable hooks                            |
| `client/src/pages/`      | Application screens                                                                      |
| `client/src/types/`      | TypeScript types for API responses                                                       |
| `server/prisma/`         | Database schema, migrations, and seed data                                               |
| `server/src/config/`     | Environment configuration and validation                                                 |
| `server/src/domain/`     | Shared domain rules and enums                                                            |
| `server/src/events/`     | Domain events and event bus                                                              |
| `server/src/middleware/` | Authentication, error handling, and rate limiting                                        |
| `server/src/modules/`    | Authentication, tickets, users, routing, analytics, messaging, and other backend modules |
| `server/src/realtime/`   | Socket.IO authentication, rooms, and event forwarding                                    |
| `server/tests/`          | Unit and integration tests                                                               |
| `docs/screenshots/`      | Screenshots displayed in this README                                                     |

Backend modules generally follow a consistent structure:

`routes → controller → service`

Validation schemas and database selection/DTO definitions are maintained alongside the relevant module.

## Local Setup

### Prerequisites

Install the following before running the project:

- **Node.js 22.12 or newer**
- **npm 10 or newer**
- **PostgreSQL 15 or newer**, or Docker Desktop with Docker Compose
- Git, if you want to clone the repository

### 1. Install Dependencies

Open a terminal in the project root and run:

```bash
npm install
```

This installs the npm workspace dependencies and generates the Prisma client through the configured installation scripts.

### 2. Configure Environment Variables

Create the server environment file.

**Windows PowerShell:**

```powershell
Copy-Item server/.env.example server/.env
```

**macOS/Linux:**

```bash
cp server/.env.example server/.env
```

Open `server/.env` and configure the required variables, especially `JWT_SECRET` and `DATABASE_URL`.

Generate a strong session-signing secret with:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Copy the generated value into `JWT_SECRET`.

### 3. Start PostgreSQL

If using Docker Compose:

```bash
docker compose up -d
```

Check the database container:

```bash
docker compose ps
```

Wait until the database reports that it is healthy.

If you are using a local PostgreSQL installation, create an empty database and configure `DATABASE_URL` accordingly.

### 4. Apply Migrations and Seed Demo Data

Run the following commands from the project root:

```bash
npm run db:migrate
npm run db:seed
```

The migration command creates the database schema and applies the required indexes, triggers, and constraints. The seed command creates demo users and sample tickets.

### 5. Start the Application

```bash
npm run dev
```

This starts the frontend and backend development servers.

| Service      | URL                                                                  |
| ------------ | -------------------------------------------------------------------- |
| Frontend     | [http://localhost:5173](http://localhost:5173)                       |
| Backend API  | [http://localhost:4000](http://localhost:4000)                       |
| Health Check | [http://localhost:4000/api/health](http://localhost:4000/api/health) |

During development, Vite proxies API and Socket.IO requests to the backend.

To run the frontend and backend separately, open two terminals and run:

**Terminal 1 — Backend**

```bash
npm run dev -w server
```

**Terminal 2 — Frontend**

```bash
npm run dev -w client
```

Open the frontend URL in your browser and sign in using one of the demo accounts below.

To test real-time collaboration, sign in as a customer in one browser window and as an agent in another, then exchange messages on the same ticket.

## Demo Accounts

The accounts below are created by `npm run db:seed`.

The default password for all seeded accounts is the value of `SEED_PASSWORD`, which defaults to `ChangeMe123!`.

| Role     | Email                     | Skills                   |
| -------- | ------------------------- | ------------------------ |
| Admin    | `admin@itsm.dev`          | —                        |
| Agent    | `grace.agent@itsm.dev`    | Network, Security        |
| Agent    | `brian.agent@itsm.dev`    | Hardware, Software       |
| Agent    | `fatuma.agent@itsm.dev`   | Access, Email            |
| Agent    | `peter.agent@itsm.dev`    | Software, Network, Other |
| Customer | `mary.customer@itsm.dev`  | —                        |
| Customer | `john.customer@itsm.dev`  | —                        |
| Customer | `lucy.customer@itsm.dev`  | —                        |
| Customer | `david.customer@itsm.dev` | —                        |

**Security note:** Change `SEED_PASSWORD` before seeding any environment accessible from the internet. Never use demo credentials for production accounts.

Seeding is repeatable: existing demo users are updated, and sample tickets are created only when the database has none.

## Available Scripts

Run these commands from the project root.

| Command                    | Description                                                     |
| -------------------------- | --------------------------------------------------------------- |
| `npm run dev`              | Starts the frontend and backend in development mode             |
| `npm run build`            | Type-checks and builds the server and client                    |
| `npm run typecheck`        | Checks TypeScript types across both workspaces                  |
| `npm test`                 | Runs unit tests without requiring a database                    |
| `npm run test:integration` | Runs integration tests against PostgreSQL                       |
| `npm run db:generate`      | Regenerates the Prisma client                                   |
| `npm run db:migrate`       | Applies pending database migrations                             |
| `npm run db:seed`          | Loads demo accounts and sample tickets                          |
| `npm run db:reset`         | Resets, migrates, and re-seeds the development database         |
| `npm run archive`          | Creates a clean project archive without dependencies or secrets |

When changing `schema.prisma` during development, use the configured development migration command:

```bash
npm run db:migrate:dev -w server
```

Review the generated migration before applying it to other environments.

## Testing

### Unit Tests

Unit tests cover:

- Ticket status transitions.
- Automated routing.
- SLA calculations and escalation rules.
- Database-error mapping.
- Other isolated business logic.

Run them with:

```bash
npm test
```

These tests do not require PostgreSQL.

### Integration Tests

Integration tests exercise the application against a real PostgreSQL database. They cover areas such as:

- Database triggers and constraints.
- Authentication and permissions.
- Ticket creation, assignment, and status transitions.
- Messaging and internal-note privacy.
- Audit logging.
- Routing and analytics.

**Important:** Integration tests use a separate, disposable database. The test suite clears its `public` schema and reapplies migrations. Never configure it to use a database containing data you need to keep.

Create the test database once when using the bundled Docker setup:

```bash
docker compose exec db psql -U itsm -d postgres -c "CREATE DATABASE itsm_test"
```

**Windows PowerShell:**

```powershell
$env:DATABASE_URL_TEST="postgresql://itsm:itsm_password@localhost:5432/itsm_test"
npm run test:integration
```

**macOS/Linux:**

```bash
DATABASE_URL_TEST=postgresql://itsm:itsm_password@localhost:5432/itsm_test npm run test:integration
```

Replace the example credentials if your PostgreSQL configuration uses different values.

If `DATABASE_URL_TEST` is not configured, the integration suites skip themselves.

## API Reference

All endpoints are mounted under `/api`, accept JSON where applicable, and use the session cookie for authenticated requests.

API errors follow this structure:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "A description of the error",
    "details": {}
  }
}
```

### Authentication and Health

| Method | Endpoint             | Access        | Description                                         |
| ------ | -------------------- | ------------- | --------------------------------------------------- |
| `GET`  | `/api/health`        | Public        | Checks application health and database connectivity |
| `POST` | `/api/auth/register` | Public        | Registers a customer account                        |
| `POST` | `/api/auth/login`    | Public        | Signs in and sets the session cookie                |
| `POST` | `/api/auth/logout`   | Public        | Signs out                                           |
| `GET`  | `/api/auth/me`       | Authenticated | Returns the current user                            |

### Tickets and Messaging

| Method  | Endpoint                    | Access         | Description                                                 |
| ------- | --------------------------- | -------------- | ----------------------------------------------------------- |
| `GET`   | `/api/tickets`              | Authenticated  | Lists tickets with filtering, sorting, and pagination       |
| `POST`  | `/api/tickets`              | Authenticated  | Creates a ticket with automated routing and escalation      |
| `GET`   | `/api/tickets/:id`          | Owner or staff | Returns ticket details, messages, and permitted transitions |
| `PATCH` | `/api/tickets/:id/status`   | Owner or staff | Changes ticket status through the state machine             |
| `PATCH` | `/api/tickets/:id/assignee` | Staff          | Assigns, reassigns, or unassigns a ticket                   |
| `PATCH` | `/api/tickets/:id/priority` | Staff          | Changes ticket priority and SLA deadline                    |
| `GET`   | `/api/tickets/:id/activity` | Staff          | Returns a ticket's audit timeline                           |
| `POST`  | `/api/tickets/:id/messages` | Owner or staff | Sends a message or staff-only internal note                 |

The ticket-list endpoint supports filters including:

- `status`
- `priority`
- `category`
- `assignee` (`me`, `unassigned`, or a user ID)
- `q` for text search
- `sort` (`newest`, `oldest`, `updated`, or `priority`)
- `page`
- `pageSize`

Customers can only access their own tickets.

### Analytics, Notifications, and Users

| Method  | Endpoint                         | Access        | Description                                               |
| ------- | -------------------------------- | ------------- | --------------------------------------------------------- |
| `GET`   | `/api/analytics/overview?days=7` | Staff         | Returns dashboard metrics; supports 7, 14, 30, or 90 days |
| `GET`   | `/api/notifications`             | Authenticated | Returns the notification inbox and unread count           |
| `POST`  | `/api/notifications/:id/read`    | Authenticated | Marks a notification as read                              |
| `POST`  | `/api/notifications/read-all`    | Authenticated | Marks all notifications as read                           |
| `GET`   | `/api/users/staff`               | Staff         | Lists assignable staff                                    |
| `GET`   | `/api/users`                     | Admin         | Lists users                                               |
| `PATCH` | `/api/users/:id`                 | Admin         | Updates user roles, activation, or agent skills           |
| `GET`   | `/api/audit`                     | Admin         | Returns the global audit stream with filters              |

### Common API Error Codes

| Code                        | HTTP Status | Meaning                                                 |
| --------------------------- | ----------: | ------------------------------------------------------- |
| `VALIDATION_ERROR`          |         400 | Request data is invalid                                 |
| `UNAUTHORIZED`              |         401 | Authentication is required                              |
| `FORBIDDEN`                 |         403 | The user lacks permission                               |
| `NOT_FOUND`                 |         404 | The requested resource was not found or is inaccessible |
| `INVALID_STATUS_TRANSITION` |         422 | The requested ticket transition is not permitted        |
| `STALE_TICKET`              |         409 | The ticket changed before the update could be applied   |
| `TICKET_CLOSED`             |         409 | The ticket is closed and cannot be modified in that way |
| `RATE_LIMITED`              |         429 | Too many requests                                       |

## Real-Time Events

Socket.IO authenticates connections using the same session cookie as the REST API. Unauthenticated connections are rejected.

### Server-to-Client Events

| Event              | Payload                                | Recipients                                           |
| ------------------ | -------------------------------------- | ---------------------------------------------------- |
| `ticket:created`   | Ticket summary                         | Staff and requester                                  |
| `ticket:updated`   | `{ ticket, change }`                   | Staff, requester, and authorised ticket participants |
| `message:new`      | `{ ticketId, message }`                | Public ticket room or staff-only ticket room         |
| `activity:new`     | Audit entry                            | Authorised ticket staff                              |
| `notification:new` | Notification                           | Intended recipient                                   |
| `ticket:typing`    | `{ ticketId, userId, name, isTyping }` | Other authorised participants                        |

### Client-to-Server Events

| Event           | Payload                  | Description                                                 |
| --------------- | ------------------------ | ----------------------------------------------------------- |
| `ticket:join`   | `{ ticketId }`           | Requests access to a ticket room; permissions are rechecked |
| `ticket:leave`  | `{ ticketId }`           | Leaves a ticket room                                        |
| `ticket:typing` | `{ ticketId, isTyping }` | Sends typing status after successfully joining the room     |

## Configuration

Server configuration is managed through `server/.env` and validated at startup.

| Variable               | Default                 | Description                                                                            |
| ---------------------- | ----------------------- | -------------------------------------------------------------------------------------- |
| `NODE_ENV`             | `development`           | Runtime environment: `development`, `test`, or `production`                            |
| `PORT`                 | `4000`                  | Backend API port                                                                       |
| `DATABASE_URL`         | Required                | PostgreSQL connection string                                                           |
| `JWT_SECRET`           | Required                | Session-signing secret of at least 32 characters                                       |
| `JWT_EXPIRES_IN_HOURS` | `12`                    | Session lifetime in hours                                                              |
| `CLIENT_ORIGIN`        | `http://localhost:5173` | Allowed browser origin for CORS and Socket.IO                                          |
| `ASSIGNMENT_STRATEGY`  | `LEAST_ACTIVE`          | Default routing strategy: `LEAST_ACTIVE` or `ROUND_ROBIN`                              |
| `LOG_LEVEL`            | `info`                  | Logging level, such as `fatal`, `error`, `warn`, `info`, `debug`, `trace`, or `silent` |
| `SEED_PASSWORD`        | `ChangeMe123!`          | Password assigned to seeded demo accounts                                              |

Optional frontend variables are configured through `client/.env`:

| Variable                | Description                                            |
| ----------------------- | ------------------------------------------------------ |
| `VITE_API_PROXY_TARGET` | Changes the target used by the Vite development proxy  |
| `VITE_API_URL`          | Configures the API URL for a production frontend build |

Use the `.env.example` files as the source of truth for the variables supported by your current project version.

**Never commit `.env` files, production secrets, or real credentials to GitHub.**

## Deployment

The application requires a deployed Node.js backend and PostgreSQL database for its full functionality.

### Production Deployment Steps

1. Provision a PostgreSQL database.
2. Configure `DATABASE_URL`, a strong `JWT_SECRET`, `NODE_ENV=production`, and the correct `CLIENT_ORIGIN` on the backend.
3. Install dependencies and build the application:

   ```bash
   npm ci
   npm run build
   ```

4. Apply pending database migrations:

   ```bash
   npm run db:migrate
   ```

5. Start the backend:

   ```bash
   npm start -w server
   ```

6. Serve the built frontend from `client/dist`.
7. Configure a reverse proxy or load balancer to forward `/api` and `/socket.io` to the backend. Ensure WebSocket upgrades are supported.
8. Enable HTTPS and verify that production cookies use the `Secure` attribute.

Do not run the demo seed script in production.

Serving the frontend and API from the same origin simplifies cookie-based authentication. If they use different origins, configure CORS, cookie settings, and credentials carefully.

### Continuous Integration

A recommended CI pipeline should run:

1. `npm ci`
2. `npm run typecheck`
3. `npm test`
4. `npm run test:integration` against a dedicated PostgreSQL test database.
5. `npm run build`

### Scaling

The current real-time event bus and Socket.IO connection state are designed for a single backend instance.

For multiple instances, consider introducing a Redis adapter for Socket.IO and a shared event-publishing mechanism so events reach connected users across all instances.

## Design Decisions and Future Improvements

### Key Design Decisions

- **Transactional commands:** Ticket changes and related audit entries are committed together.
- **Events after commit:** Prevents clients from receiving real-time updates for database changes that were rolled back.
- **Database-level safeguards:** Triggers and constraints protect important rules even when changes bypass application services.
- **Separation of concerns:** Routes, controllers, services, and domain logic have distinct responsibilities.
- **Testable business logic:** Routing, ticket transitions, and SLA calculations can be tested independently.
- **Centralised server state:** TanStack Query manages API data, while real-time events trigger cache updates.
- **SQL-based reporting:** PostgreSQL performs analytics aggregations, while Prisma handles transactional application operations.

### Potential Future Improvements

- Email notifications through a dedicated notification adapter.
- File attachments stored in object storage using signed URLs.
- Business-hours-aware SLA calculations and automatic SLA pauses.
- A knowledge base with suggested solutions for common support requests.
- Saved ticket filters and personalised queue views.
- Redis-backed real-time event distribution for multi-instance deployments.
- Expanded end-to-end tests and automated deployment workflows.

## Troubleshooting

| Problem                                                 | Possible Solution                                                                                     |
| ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `Invalid environment configuration`                     | Check `server/.env` for missing or invalid values. Ensure `JWT_SECRET` is at least 32 characters.     |
| `Cannot find module '../generated/prisma/client'`       | Run `npm run db:generate` and check the configured Prisma generator.                                  |
| `Ticket state machine is out of sync with the database` | Apply pending migrations using `npm run db:migrate`.                                                  |
| `ECONNREFUSED` on port 5432                             | Start PostgreSQL with `docker compose up -d` and wait for it to become healthy.                       |
| Port 5432, 4000, or 5173 is already in use              | Stop the conflicting process or change the relevant port configuration.                               |
| Login does not persist in production                    | Verify HTTPS, cookie settings, frontend/API origin configuration, and reverse-proxy headers.          |
| Integration tests are skipped                           | Configure `DATABASE_URL_TEST` to point to a dedicated test database.                                  |
| Frontend cannot reach the API                           | Verify that the backend is running and that the development proxy or production API URL is correct.   |
| Real-time updates are missing                           | Check the Socket.IO connection, authentication cookie, server logs, and room permissions.             |
| Screenshots do not appear on GitHub                     | Confirm that all four image files exist under `docs/screenshots/` and have been committed and pushed. |

## License

This project is licensed under the MIT License.
