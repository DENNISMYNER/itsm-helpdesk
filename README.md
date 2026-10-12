# Task Board

A real-time, collaborative Kanban board inspired by Trello and Linear. Organize workspaces, manage tasks, and collaborate with team members through a responsive interface with live updates.

Built with a modern TypeScript stack, PostgreSQL, and Socket.IO.

<!-- Replace these placeholders with screenshots of the running application. -->
<!--
## Preview

![Task Board Preview](docs/screenshots/board.png)
-->

## Features

- **Kanban task management** — Organize tasks into board columns with drag-and-drop interactions.
- **Real-time collaboration** — Synchronize board changes across connected clients using Socket.IO.
- **Workspaces and membership** — Organize teams and manage workspace members.
- **Authentication** — Secure API access using JWT-based authentication.
- **Persistent storage** — Store application data in PostgreSQL using Prisma ORM.
- **Input validation** — Validate incoming data with Zod.
- **Type-safe development** — Use TypeScript across the frontend and backend.
- **Automated testing** — Run backend and frontend tests to verify application behavior.
- **Developer-friendly setup** — Run the database locally with Docker Compose.

## Tech Stack

### Frontend

| Technology | Purpose |
|---|---|
| React 19 | User interface |
| TypeScript | Static typing |
| Vite | Development server and build tooling |
| Tailwind CSS v4 | Styling |
| TanStack Query | Server-state management |
| dnd-kit | Drag-and-drop interactions |
| Socket.IO Client | Real-time communication |

### Backend

| Technology | Purpose |
|---|---|
| Node.js 22 | JavaScript runtime |
| Express 5 | HTTP API and middleware |
| TypeScript | Static typing |
| PostgreSQL 15+ | Relational database |
| Prisma ORM 7 | Database access and migrations |
| Socket.IO | Real-time event communication |
| Zod | Request and data validation |
| JWT | Token-based authentication |

## Architecture

The application separates the frontend, backend API, database, and real-time communication into distinct layers.

```text
task-board-app/
├── server/
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── migrations/
│   ├── src/
│   │   ├── server.ts
│   │   ├── modules/
│   │   │   └── ...
│   │   ├── middleware/
│   │   └── realtime/
│   └── package.json
│
├── client/
│   ├── src/
│   │   ├── lib/
│   │   │   └── api/
│   │   ├── features/
│   │   │   └── board/
│   │   ├── components/
│   │   └── ...
│   ├── vite.config.ts
│   └── package.json
│
├── docker-compose.yml
├── AUDIT.md
└── README.md
```

*The directory tree above highlights the main application areas. Individual files and modules may vary with the implementation.*

### How it works

1. **React client:** Renders the interface and manages server state through TanStack Query.
2. **Express API:** Processes HTTP requests, applies middleware, validates input, and executes application logic.
3. **PostgreSQL and Prisma:** Persist application data and manage database schema migrations.
4. **Socket.IO:** Delivers real-time events to connected clients when relevant board data changes.
5. **Authentication and validation:** JWT-based authentication and Zod validation help protect API operations and enforce data contracts.

For additional implementation notes, see [`AUDIT.md`](AUDIT.md).

## Prerequisites

Install the following before running the application:

- [Node.js 22 or later](https://nodejs.org/)
- npm
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) or another Docker-compatible environment with Docker Compose
- Git, if cloning the repository

Alternatively, use PostgreSQL 15 or later installed locally and configure the appropriate database connection string.

## Getting Started

Follow these steps to run the application locally.

### 1. Clone the repository

```bash
git clone <your-repository-url>
cd task-board-app
```

Replace `<your-repository-url>` with your actual Git repository URL.

### 2. Start PostgreSQL

From the project root, run:

```bash
docker compose up -d
```

This starts the PostgreSQL service defined in `docker-compose.yml`.

Ensure the database is healthy and its connection settings match those configured in the backend environment.

### 3. Configure the backend

Open a terminal at the project root:

```bash
cd server
```

Create the environment file:

```bash
cp .env.example .env
```

Open `server/.env` and configure the required values.

At minimum, ensure the database connection string and JWT secret are configured correctly.

Generate a secure JWT secret using Node.js:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

Copy the generated value into `JWT_ACCESS_SECRET` in `server/.env`.

Install dependencies:

```bash
npm install
```

Apply the existing Prisma migrations:

```bash
npx prisma migrate deploy
```

Start the backend development server:

```bash
npm run dev
```

The backend is expected to run at:

**http://localhost:4000**

Keep this terminal running.

### 4. Configure the frontend

Open a second terminal at the project root:

```bash
cd client
```

Create the frontend environment file:

```bash
cp .env.example .env
```

Install dependencies:

```bash
npm install
```

Start the Vite development server:

```bash
npm run dev
```

The frontend is expected to run at:

**http://localhost:5173**

### 5. Open the application

Visit [http://localhost:5173](http://localhost:5173) in your browser.

Register an account, create a workspace, and create a board.

To test collaboration:

1. Open the application in a second browser profile.
2. Register or sign in with a second account.
3. Add that account to the workspace through the member-management interface.
4. Open the same board in both browser profiles.
5. Make changes and verify that connected clients receive the relevant updates.

Both accounts must have the necessary workspace and board permissions.

## Environment Variables

Configure the following variables in the appropriate environment files.

### Backend — `server/.env`

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_ACCESS_SECRET` | Secret used to sign access tokens |
| `CLIENT_ORIGIN` | Allowed frontend origin for CORS and Socket.IO |
| `PORT` | Backend port; defaults to `4000` if configured that way in the application |
| `ACCESS_TOKEN_TTL_SECONDS` | Optional access-token lifetime |
| `REFRESH_TOKEN_TTL_DAYS` | Optional refresh-token lifetime |

Example values:

```dotenv
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/task_board?schema=public"
JWT_ACCESS_SECRET="replace-with-a-secure-random-secret"
CLIENT_ORIGIN="http://localhost:5173"
PORT=4000
```

Adjust the database username, password, database name, and other values to match your local setup.

**Security:** Never commit real secrets or production environment files to version control. Keep `.env` files private and provide `.env.example` files containing placeholders instead.

### Frontend — `client/.env`

| Variable | Description |
|---|---|
| `API_PROXY_TARGET` | Backend origin used by Vite to proxy API and Socket.IO requests during development |
| `VITE_API_URL` | Optional API base URL when the frontend communicates with a different origin |

For a standard local setup, leave `VITE_API_URL` empty if the application uses same-origin requests through the Vite proxy.

The default backend origin is expected to be `http://localhost:4000`.

## Database Migrations

Prisma migrations are used to manage database schema changes.

Apply existing migrations:

```bash
cd server
npx prisma migrate deploy
```

When developing locally and changing `prisma/schema.prisma`, create and apply a migration using:

```bash
npx prisma migrate dev
```

If the project provides a Prisma generation script, run it after relevant schema or dependency changes:

```bash
npx prisma generate
```

Review migration files before applying schema changes to shared or production databases.

## Testing and Code Quality

Run the backend checks from the project root:

```bash
cd server
npm run typecheck
npm test
```

Run the frontend checks:

```bash
cd client
npm run typecheck
npm run lint
npm test
```

The current project documentation reports:

- **Backend:** 23 tests
- **Frontend:** 16 tests

These counts should be updated whenever the test suites change.

For a final verification, run the checks independently in both directories and confirm that every command exits successfully.

## Production Build

Build the backend:

```bash
cd server
npm run build
```

Apply production database migrations:

```bash
npm run db:deploy
```

Start the backend:

```bash
npm start
```

Build the frontend in a separate terminal:

```bash
cd client
npm run build
```

Vite generates the production frontend in `client/dist`.

### Deployment considerations

For a production deployment:

- Use a managed or properly secured PostgreSQL instance.
- Configure a strong JWT secret through your deployment platform's secret-management system.
- Set the correct frontend origin for CORS and Socket.IO.
- Configure the frontend and backend to use the intended production origins.
- Serve the frontend build using a static web server or hosting platform.
- Route `/api` requests to the backend.
- Route `/socket.io` requests to the backend and support WebSocket connections.
- Use HTTPS in production.
- Configure database backups, logging, and application monitoring.
- Review authentication, authorization, token expiration, and refresh-token handling before deployment.

When deploying the frontend and backend on the same origin, configure the reverse proxy to forward API and Socket.IO traffic to the backend while serving the frontend assets.

## Troubleshooting

### PostgreSQL connection errors

- Confirm that Docker Compose started the database successfully.
- Verify `DATABASE_URL` in `server/.env`.
- Check that the database credentials and port match the running PostgreSQL instance.
- Confirm that migrations have been applied.

### Frontend cannot reach the backend

- Confirm that the backend is running on the configured port.
- Verify `API_PROXY_TARGET` and `VITE_API_URL`.
- Check the browser console and network requests.
- Ensure CORS and Socket.IO allow the configured frontend origin when cross-origin requests are used.

### Real-time updates are not working

- Confirm that the Socket.IO client connects successfully.
- Verify the backend Socket.IO configuration and allowed origin.
- Check that both users belong to the relevant workspace and have the required permissions.
- Inspect browser and server logs for connection or authorization errors.

### VS Code reports TypeScript errors

1. Install dependencies in both `server/` and `client/`.
2. Open the repository root in VS Code.
3. Open the Command Palette.
4. Select **TypeScript: Select TypeScript Version**.
5. Choose **Use Workspace Version**.
6. If stale errors remain, run **Developer: Reload Window**.

Missing dependencies can cause imports to appear unresolved even when the source code is correct.

## Project Notes

- `AUDIT.md` documents cross-layer considerations involving API contracts, real-time communication, error handling, and middleware.
- The application uses separate frontend and backend packages.
- The project is designed for local development with PostgreSQL and can be configured for production deployment.

## Contributing

Contributions and improvements are welcome.

1. Fork the repository.
2. Create a feature branch.
3. Implement your changes.
4. Run the relevant type checks, linting, and tests.
5. Submit a pull request describing the changes.

## License

No license has been specified yet. Add a `LICENSE` file and update this section before distributing the project if you intend to make it open source.
