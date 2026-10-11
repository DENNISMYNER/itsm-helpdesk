# ITSM Helpdesk

An IT helpdesk and customer-support ticketing system. Customers raise requests and chat with support in real time; agents work a prioritised queue with automatic routing, SLA tracking and a live analytics dashboard; admins manage the team and review a permanent audit trail.

## Contents

- [Features](#features)
- [Technologies](#technologies)
- [Architecture](#architecture)
- [Project structure](#project-structure)
- [Local setup](#local-setup)
- [Demo accounts](#demo-accounts)
- [Scripts](#scripts)
- [Testing](#testing)
- [API reference](#api-reference)
- [Real-time events](#real-time-events)
- [Configuration](#configuration)
- [Deployment](#deployment)
- [Design decisions and next steps](#design-decisions-and-next-steps)
- [Troubleshooting](#troubleshooting)

## Features

| Area | What it does |
| --- | --- |
| **Status state machine** | `OPEN → IN_PROGRESS → WAITING_ON_CUSTOMER → RESOLVED → CLOSED`, plus the two legal loops (work resumes after waiting; a resolved ticket can be reopened). `CLOSED` is terminal. Enforced in the API **and** by a PostgreSQL trigger. |
| **Automated routing** | A rule engine assigns each new ticket by category and priority using *least-active* (priority-weighted workload) or *round-robin* selection, preferring agents whose skills match. |
| **Real-time collaboration** | Socket.io powers live chat, typing indicators, notifications and instant queue/dashboard updates. |
| **Analytics** | Average resolution time, first-response time, SLA compliance, ticket volume per day, status/priority/category breakdowns and per-agent results, computed in SQL on indexed columns. |
| **Audit log** | Every ticket creation, status change, assignment, priority change and internal note is recorded. The table is append-only: database triggers reject `UPDATE`, `DELETE` and `TRUNCATE`. |
| **Priorities and SLA** | `LOW / MEDIUM / HIGH / CRITICAL` with resolution targets of 72 h / 24 h / 8 h / 4 h. Keyword rules escalate obvious emergencies (for example a suspected phishing attack). |
| **Roles** | Customers see only their own tickets; agents work the queue; admins also manage users and see the global audit stream. Internal notes never reach customers. |
| **Notifications** | In-app notifications for assignments, status changes and new messages, delivered live and kept in an inbox. |

## Technologies

| Layer | Stack |
| --- | --- |
| Frontend | React 19, TypeScript, Vite, React Router, TanStack Query, Tailwind CSS v4, Lucide React icons |
| Backend | Node.js, Express 5, Socket.io, Zod (validation), Pino (logging), Helmet, express-rate-limit |
| Database | PostgreSQL with Prisma ORM (compound indexes, raw SQL for reporting, SQL triggers for guarantees) |
| Auth | Password hashing with bcrypt; session token in an `httpOnly`, `SameSite=Lax` cookie (also used to authenticate WebSockets) |
| Testing | Vitest (unit and integration against a real PostgreSQL) |
| Tooling | npm workspaces, Docker Compose for local PostgreSQL |

## Architecture

```text
┌────────────────────────────── Browser ──────────────────────────────┐
│  React app  ──  TanStack Query cache  ◄──── live invalidation ◄──┐  │
│     │ REST (cookie session)                                       │  │
└─────┼─────────────────────────────────────────────────────────────┼──┘
      │ /api/*                                          /socket.io  │
┌─────▼─────────────────────────────────────────────────────────────┼──┐
│  Express                                                          │  │
│   middleware: helmet · cors · rate-limit · auth · error handler   │  │
│   routes ─► controller (parse + validate) ─► service (rules)      │  │
│                                   │                               │  │
│                  one DB transaction per command                   │  │
│          (state machine · routing · audit · notifications)        │  │
│                                   │ after COMMIT                  │  │
│                         domain event bus ──► Socket.io gateway ───┘  │
└───────────────────────────────────┬──────────────────────────────────┘
                                    │ Prisma (pg driver adapter)
                       ┌────────────▼─────────────┐
                       │       PostgreSQL         │
                       │ indexes · triggers · FKs │
                       └──────────────────────────┘
```

### Request lifecycle

1. **Route → controller.** Controllers parse input with Zod and call a service. They contain no business rules.
2. **Service → command runner.** Every change to a ticket runs inside one database transaction (`runCommand`). The transition, the audit entry and the notifications commit together or not at all.
3. **After commit → events.** Services queue *domain events* while the transaction runs. They are published only after `COMMIT`, so clients never hear about a change that was rolled back.
4. **Gateway.** The Socket.io gateway is the only code that knows about sockets. It subscribes to the event bus and pushes updates to the right rooms.

### Status state machine (two layers)

- **API layer** (`ticket.state-machine.ts`): the table of legal edges and which roles may use them. It produces friendly errors: `422 INVALID_STATUS_TRANSITION` for an edge that does not exist and `403` for an edge the role may not use. Customers may only confirm (`CLOSED`) or reopen (`IN_PROGRESS`) a resolved ticket.
- **Database layer** (migration `db_guards`): a `BEFORE INSERT OR UPDATE OF status` trigger consults the `ticket_status_transitions` table, and `CHECK` constraints keep `resolvedAt` / `closedAt` consistent with the status. Even a manual SQL statement cannot skip a stage.
- **Drift protection:** on start-up the server compares both copies and refuses to boot if they disagree. Updates are also conditional on the status that was read, so two agents racing on one ticket cannot both win (`409 STALE_TICKET`).

### Automated routing

`routing.engine.ts` is pure logic (no database, clock or environment), so every branch is unit-tested. Rules are evaluated in order; the first match wins:

| Rule | When | Selection |
| --- | --- | --- |
| `critical-least-active` | priority is `CRITICAL` | least-loaded skilled agent |
| `security-least-active` | category is `SECURITY` | least-loaded security specialist |
| `specialist-round-robin` | any other category except `OTHER` | rotate fairly between matching specialists |
| `default` | everything else | the configured `ASSIGNMENT_STRATEGY` |

*Workload* is priority-weighted (`LOW 1`, `MEDIUM 2`, `HIGH 3`, `CRITICAL 5` per active ticket). If a rule wants a specialist and none exists, the pool falls back to all agents so tickets never sit unrouted. An advisory lock serialises concurrent ticket creation so two requests cannot read the same workload and pick the same agent. The automated assignment is recorded in the audit log with the rule that decided it.

### Analytics and indexing

Aggregations run in PostgreSQL, not in Node. The compound indexes in `schema.prisma` map to real query paths:

| Index | Serves |
| --- | --- |
| `tickets (status, priority, createdAt DESC)` | staff queue filtered by status, sorted by urgency |
| `tickets (assigneeId, status, updatedAt DESC)` | "my queue" and per-agent workload |
| `tickets (requesterId, createdAt DESC)` | "my tickets" for customers |
| `tickets (category, status)` | category filters and breakdowns |
| `tickets (createdAt)` / `tickets (resolvedAt)` | volume-over-time and resolution-time range scans |
| `tickets (status, slaDueAt)` | overdue (SLA) scans over active tickets |
| `audit_logs (ticketId, createdAt)` and others | per-ticket timeline, global stream, actor and action filters |
| `notifications (userId, readAt, createdAt DESC)` | inbox and unread counts |

### Real-time rooms and privacy

Rooms are the authorisation boundary of the real-time layer. A socket only receives what is emitted to rooms it was allowed to join:

- `staff` — every agent and admin (live queue and dashboard)
- `user:<id>` — one person's private channel (notifications, "my tickets")
- `ticket:<id>` — participants of a ticket (public chat)
- `ticket:<id>:staff` — staff on a ticket (internal notes and audit activity)

Joining a ticket room re-checks permissions on the server, and internal notes are only ever emitted to the staff room.

### Security notes

- Session cookie is `httpOnly`, `SameSite=Lax` and `Secure` in production; users are re-read on every request, so deactivation and role changes apply immediately.
- Login does not reveal whether an email exists, and compares against a dummy hash to keep timing uniform.
- Every input is validated with Zod; error responses use a stable `{ error: { code, message, details? } }` shape.
- Rate limiting on the whole API and a stricter limit on sign-in and registration.
- Ticket ids cannot be probed: another customer's ticket returns `404`, not `403`.
- Admins cannot demote or deactivate themselves.
- Secrets come from environment variables; the server refuses to start with a weak `JWT_SECRET`.

## Project structure

```text
itsm-helpdesk/
├── docker-compose.yml          # local PostgreSQL
├── package.json                # npm workspaces + root scripts
├── scripts/package.sh          # builds a clean zip of the project
├── server/
│   ├── prisma/
│   │   ├── schema.prisma       # data model + compound indexes
│   │   ├── migrations/         # init + db_guards (triggers, constraints)
│   │   └── seed.ts             # demo users and ~54 tickets
│   ├── src/
│   │   ├── config/             # validated environment
│   │   ├── domain/             # enums shared by all layers (no persistence imports)
│   │   ├── events/             # domain events + in-process event bus
│   │   ├── lib/                # errors, tokens, password, pagination, Prisma client
│   │   ├── middleware/         # auth, errors, rate limiting
│   │   ├── modules/
│   │   │   ├── auth/  users/  notifications/  audit/  analytics/  health/
│   │   │   ├── messages/       # chat + internal notes
│   │   │   ├── routing/        # rule engine, escalation, workload loading
│   │   │   └── tickets/        # state machine, commands, queries, SLA
│   │   ├── realtime/           # Socket.io server, auth, rooms, event forwarder
│   │   ├── routes/             # mounts every module under /api
│   │   ├── app.ts              # Express app (testable without listening)
│   │   └── server.ts           # start-up, graceful shutdown
│   └── tests/
│       ├── unit/               # state machine, routing, SLA, error mapping
│       └── integration/        # DB triggers + full API flow (real PostgreSQL)
└── client/
    └── src/
        ├── api/                # typed endpoint functions
        ├── components/         # ui/ · layout/ · tickets/ · analytics/
        ├── context/            # auth, socket, toasts, live sync
        ├── hooks/              # data hooks, ticket room, live sync, debounce
        ├── lib/                # formatting, labels, query keys, filters
        ├── pages/              # one file per screen
        └── types/              # API response types
```

Each backend module follows the same shape: `*.routes.ts` → `*.controller.ts` → `*.service.ts`, with `*.schemas.ts` (Zod) and `*.selects.ts` (Prisma selects and DTO types) alongside.

## Local setup

### Prerequisites

- **Node.js 22.12 or newer** and npm 10+ (`node -v`)
- **PostgreSQL 15+**, either through **Docker** (recommended, a compose file is included) or a local installation
- Git (optional)

### 1. Install dependencies

From the project root:

```bash
npm install
```

This installs both workspaces and generates the Prisma client automatically.

### 2. Configure environment variables

```bash
# macOS / Linux
cp server/.env.example server/.env

# Windows (PowerShell)
Copy-Item server/.env.example server/.env
```

Open `server/.env` and set at least `JWT_SECRET`. Generate one with:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

The defaults already match the bundled Docker database. See [Configuration](#configuration) for every variable.

### 3. Start PostgreSQL

With Docker:

```bash
docker compose up -d
```

Wait until `docker compose ps` shows the database as *healthy*. If you use your own PostgreSQL instead, create an empty database and put its connection string in `DATABASE_URL`.

### 4. Create the schema and load demo data

```bash
npm run db:migrate   # applies the migrations (tables, indexes, triggers, constraints)
npm run db:seed      # demo accounts and sample tickets
```

Optional check that the live schema matches `schema.prisma`:

```bash
cd server && npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --exit-code
```

### 5. Run the app

```bash
npm run dev
```

This starts both processes:

| Service | URL |
| --- | --- |
| Web app (Vite) | http://localhost:5173 |
| API and Socket.io | http://localhost:4000 (health check: `/api/health`) |

In development the web app proxies `/api` and `/socket.io` to the API, so the browser only ever talks to one origin. To run the processes separately, use `npm run dev -w server` and `npm run dev -w client` in two terminals.

Sign in with one of the demo accounts below. To see real-time behaviour, sign in as a customer in one browser window and as an agent in another (a private window works), then reply to the same ticket from both.

## Demo accounts

Created by `npm run db:seed`. The password for every account is the `SEED_PASSWORD` value (default `ChangeMe123!`).

| Role | Email | Skills |
| --- | --- | --- |
| Admin | `admin@itsm.dev` | - |
| Agent | `grace.agent@itsm.dev` | Network, Security |
| Agent | `brian.agent@itsm.dev` | Hardware, Software |
| Agent | `fatuma.agent@itsm.dev` | Access, Email |
| Agent | `peter.agent@itsm.dev` | Software, Network, Other |
| Customer | `mary.customer@itsm.dev` | - |
| Customer | `john.customer@itsm.dev` | - |
| Customer | `lucy.customer@itsm.dev` | - |
| Customer | `david.customer@itsm.dev` | - |

Change `SEED_PASSWORD` before seeding anything that is reachable from the internet. Seeding is repeatable: users are updated in place and sample tickets are only created when the database has none.

## Scripts

Run from the project root.

| Command | Description |
| --- | --- |
| `npm run dev` | API and web app with hot reload |
| `npm run build` | Type-checks and builds the server (`server/dist`) and client (`client/dist`) |
| `npm run typecheck` | Strict TypeScript check of both packages |
| `npm test` | Unit tests (no database needed) |
| `npm run test:integration` | Integration tests against a real PostgreSQL (see below) |
| `npm run db:generate` | Regenerates the Prisma client |
| `npm run db:migrate` | Applies pending migrations (`prisma migrate deploy`) |
| `npm run db:seed` | Loads the demo data |
| `npm run db:reset` | Drops, re-migrates and re-seeds the database (development only) |
| `npm run archive` | Writes a clean `../itsm-helpdesk.zip` without dependencies or secrets |

Run `npm run db:migrate:dev -w server` when you change `schema.prisma` and need Prisma to author a new migration.

## Testing

**Unit tests** cover the state machine, routing engine, escalation rules, SLA maths and database-error mapping. They need nothing external:

```bash
npm test
```

**Integration tests** exercise the real thing: the PostgreSQL triggers and constraints directly through SQL, and the full HTTP API (authentication, roles, routing, state machine, chat privacy, audit trail, analytics).

They use a **separate, disposable database**. The suite wipes its `public` schema and re-applies the migrations on every run, so never point it at data you care about.

```bash
# create the test database once (Docker setup)
docker compose exec db psql -U itsm -d postgres -c "CREATE DATABASE itsm_test"

# macOS / Linux
DATABASE_URL_TEST=postgresql://itsm:itsm_password@localhost:5432/itsm_test npm run test:integration

# Windows (PowerShell)
$env:DATABASE_URL_TEST="postgresql://itsm:itsm_password@localhost:5432/itsm_test"; npm run test:integration
```

Without `DATABASE_URL_TEST` the integration suites skip themselves.

## API reference

All endpoints live under `/api`, use JSON and authenticate with the session cookie. Errors look like `{ "error": { "code": "...", "message": "...", "details": ... } }`.

| Method and path | Access | Description |
| --- | --- | --- |
| `GET /health` | public | Liveness and database reachability |
| `POST /auth/register` | public | Create a customer account |
| `POST /auth/login` | public | Sign in (sets the session cookie) |
| `POST /auth/logout` | public | Sign out |
| `GET /auth/me` | signed in | Current user |
| `GET /tickets` | signed in | List with filters: `status`, `priority`, `category` (comma-separated), `assignee` (`me`, `unassigned` or a user id), `q`, `sort` (`newest`, `oldest`, `updated`, `priority`), `page`, `pageSize`. Customers only ever see their own tickets |
| `POST /tickets` | signed in | Create (routed and escalated automatically) |
| `GET /tickets/:id` | owner or staff | Detail with messages and the transitions you may perform |
| `PATCH /tickets/:id/status` | owner or staff | Change status through the state machine |
| `PATCH /tickets/:id/assignee` | staff | Assign, reassign or unassign |
| `PATCH /tickets/:id/priority` | staff | Change priority (moves the SLA deadline) |
| `GET /tickets/:id/activity` | staff | Audit timeline of one ticket |
| `POST /tickets/:id/messages` | owner or staff | Chat message; `isInternal: true` for a staff-only note |
| `GET /analytics/overview?days=7\|14\|30\|90` | staff | Dashboard metrics |
| `GET /notifications` | signed in | Inbox and unread count |
| `POST /notifications/:id/read`, `POST /notifications/read-all` | signed in | Mark as read |
| `GET /users/staff` | staff | Assignable staff |
| `GET /users`, `PATCH /users/:id` | admin | Manage roles, activation and agent skills |
| `GET /audit` | admin | Global activity stream with filters |

Common error codes: `VALIDATION_ERROR` (400), `UNAUTHORIZED` (401), `FORBIDDEN` (403), `NOT_FOUND` (404), `INVALID_STATUS_TRANSITION` (422), `STALE_TICKET` and `TICKET_CLOSED` (409), `RATE_LIMITED` (429).

## Real-time events

Connect with the same cookie as the REST API. Unauthenticated connections are rejected.

| Event (server → client) | Payload | Sent to |
| --- | --- | --- |
| `ticket:created` | ticket summary | staff, requester |
| `ticket:updated` | `{ ticket, change }` (`status`, `assignment` or `priority`) | staff, requester, ticket room |
| `message:new` | `{ ticketId, message }` | ticket room (public) or ticket staff room (internal notes) |
| `activity:new` | audit entry | ticket staff room |
| `notification:new` | notification | the recipient |
| `ticket:typing` | `{ ticketId, userId, name, isTyping }` | other participants |

| Event (client → server) | Payload | Notes |
| --- | --- | --- |
| `ticket:join` | `{ ticketId }` | Acknowledged with `{ ok }`; permissions are re-checked |
| `ticket:leave` | `{ ticketId }` | |
| `ticket:typing` | `{ ticketId, isTyping }` | Only accepted after a successful join |

## Configuration

Server variables (`server/.env`, validated at start-up):

| Variable | Default | Description |
| --- | --- | --- |
| `NODE_ENV` | `development` | `development`, `test` or `production` |
| `PORT` | `4000` | API port |
| `DATABASE_URL` | none (required) | PostgreSQL connection string |
| `JWT_SECRET` | none (required) | Session signing secret, at least 32 characters |
| `JWT_EXPIRES_IN_HOURS` | `12` | Session lifetime |
| `CLIENT_ORIGIN` | `http://localhost:5173` | Allowed browser origin for CORS and Socket.io |
| `ASSIGNMENT_STRATEGY` | `LEAST_ACTIVE` | Default routing strategy: `LEAST_ACTIVE` or `ROUND_ROBIN` |
| `LOG_LEVEL` | `info` | `fatal` … `trace`, or `silent` |
| `SEED_PASSWORD` | `ChangeMe123!` | Password given to demo accounts by the seed script |

Client variables (`client/.env`, optional): `VITE_API_PROXY_TARGET` changes where the dev server proxies to; `VITE_API_URL` points a production build at an API on another origin.

## Deployment

1. Provision PostgreSQL and set `DATABASE_URL`, a strong `JWT_SECRET`, `NODE_ENV=production` and `CLIENT_ORIGIN` (the public URL of the web app) for the server.
2. Build: `npm ci && npm run build`.
3. Apply migrations on every release: `npm run db:migrate` (safe to repeat; it only applies what is pending).
4. Run the API with `npm start -w server`. Do **not** run the seed in production.
5. Serve `client/dist` as static files from the same origin as the API behind a reverse proxy (Nginx, Caddy, a cloud load balancer) that forwards `/api` and `/socket.io` (with WebSocket upgrade) to the Node process. A shared origin keeps the session cookie first-party.
6. Terminate TLS at the proxy. In production the cookie is `Secure`, and the server trusts one proxy hop for client IP addresses.

Suggested CI steps on every push: `npm ci`, `npm run typecheck`, `npm test`, then `npm run test:integration` against a PostgreSQL service container.

**Scaling beyond one server instance:** Socket.io keeps connection state in memory. Add the Redis adapter and move the in-process event bus to Redis pub/sub so events reach sockets on every instance. Everything else is already stateless.

## Design decisions and next steps

- **Commands inside transactions, events after commit.** Prevents audit entries that disagree with data and "ghost" real-time updates.
- **Rules in the database too.** Application code can be bypassed (scripts, a second service, a bad deploy). Triggers and constraints cannot.
- **Pure domain logic.** The state machine, routing and SLA code import no database or framework, so they are fast to test and easy to change.
- **Server-sent truth with a query cache.** The client keeps server data in TanStack Query and invalidates it when a real-time event arrives, instead of duplicating state.
- **No ORM for reporting.** Averages, per-day series and per-agent results are plain SQL with explicit casts; Prisma handles everything transactional.

Natural next steps: email notifications through an adapter behind a `Notifier` interface, file attachments (object storage with signed URLs), business-hours-aware SLA clocks with pause-while-waiting, a knowledge base with suggested articles, and saved queue views.

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| `Invalid environment configuration` on start | A required variable in `server/.env` is missing or invalid; the message names it. `JWT_SECRET` needs 32+ characters |
| `Cannot find module '../generated/prisma/client'` | Run `npm run db:generate` |
| `Ticket state machine is out of sync with the database` | Migrations are missing or old: run `npm run db:migrate` |
| `ECONNREFUSED` to port 5432 | PostgreSQL is not running: `docker compose up -d` and wait for *healthy* |
| Port 5432, 4000 or 5173 already in use | Stop the other process, or change the port (`docker-compose.yml`, `PORT`, Vite `server.port`) |
| Signed out immediately in production | The cookie is `Secure`; serve over HTTPS and keep the web app and API on the same origin |
| Integration tests are skipped | Set `DATABASE_URL_TEST` (see [Testing](#testing)) |

## License

MIT
