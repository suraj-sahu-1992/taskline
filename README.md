# Taskline — MERN Task Manager

A responsive task manager built with MongoDB, Express, React, and Node.js. Includes task CRUD, Cards/List views, search, filters, sorting, server-side pagination, dashboard statistics, and toast notifications.

This is a shared workspace without authentication. Every caller accesses the same tasks.

## Requirements

- Node.js **22.19+**; Node.js 24 is supported.
- npm, included with Node.js.
- A running MongoDB 7+ instance or a MongoDB Atlas connection string.
- Git for cloning, or download the repository as a ZIP.

## Get the project

Clone the public repository; no GitHub sign-in is required:

```bash
git clone https://github.com/suraj-sahu-1992/taskline.git
cd taskline
```

Alternatively, open [the GitHub repository](https://github.com/suraj-sahu-1992/taskline), select **Code → Download ZIP**, extract it, and open a terminal in the extracted folder containing the root `package.json`.

## Install and run

Run commands from the project root. npm workspaces install and run both the frontend and backend.

### Windows — PowerShell

```powershell
npm ci
Copy-Item server/.env.example server/.env
Copy-Item client/.env.example client/.env
```

### Linux / Ubuntu

```bash
npm ci
cp server/.env.example server/.env
cp client/.env.example client/.env
```

These environment-copy commands are for initial setup; preserve existing `.env` files when updating the project.

Start your MongoDB service, or set `MONGODB_URI` in `server/.env` to your Atlas connection string. The default local connection is:

```env
MONGODB_URI=mongodb://127.0.0.1:27017/task_manager
```

Then start both applications on Windows or Linux:

```bash
npm run dev
```

- **Application:** http://127.0.0.1:3000
- **API:** http://127.0.0.1:8000/api/v1
- **Swagger UI:** http://127.0.0.1:8000/api-docs
- **Health check:** http://127.0.0.1:8000/api/v1/health
- **OpenAPI specification:** http://127.0.0.1:8000/api-docs/openapi.json

Stop both servers with **Ctrl+C**. Subsequent starts need only `npm run dev`. The backend uses Node's built-in watch mode; Vite provides frontend hot reload.

If PowerShell blocks npm scripts, run the npm commands from Windows Command Prompt instead. A database startup error means the configured MongoDB instance must be started or its connection string corrected.

To update a Git clone with a clean working tree, run `git pull --ff-only`, then `npm ci`, and restart the application. Keep your existing environment files.

## Configuration

| File          | Variable            | Example / default                             | Purpose                                        |
| ------------- | ------------------- | --------------------------------------------- | ---------------------------------------------- |
| `server/.env` | `PORT`              | `8000`                                        | Backend port                                   |
| `server/.env` | `MONGODB_URI`       | `mongodb://127.0.0.1:27017/task_manager`      | Persistent MongoDB connection                  |
| `server/.env` | `CORS_ORIGINS`      | `http://127.0.0.1:3000,http://localhost:3000` | Allowed browser origins                        |
| `server/.env` | `NODE_ENV`          | `development`                                 | Runtime environment                            |
| `server/.env` | `RATE_LIMIT_MAX`    | `300`                                         | API requests per IP per minute                 |
| `client/.env` | `VITE_API_BASE_URL` | `http://127.0.0.1:8000/api/v1`                | Frontend API URL, including the version prefix |

Restart after configuration changes. Rebuild the frontend after changing `VITE_API_BASE_URL` for deployment. `VITE_*` values are browser-visible: never place secrets in them. Environment files are excluded from Git.

## Architecture

```text
taskline/
├── client/src/    React components, hooks, Axios services, and Zod validation
├── server/src/    Express routes, middleware, controllers, services, repositories, and models
├── server/test/   MongoDB-backed API tests
├── tests/         Playwright browser tests
├── scripts/       Isolated browser-test API setup
├── package.json   Workspace commands
└── README.md
```

Backend flow: **Route → Validation middleware → Controller → Service → Repository → Mongoose model**. React Hook Form and Zod validate forms; backend Zod validation remains authoritative, with Mongoose as a database safeguard.

Helmet, CORS, rate limiting, a 16 KB JSON limit, compression, strict query validation, and centralized error handling protect the API. Task text is rendered safely through React.

## REST API

| Method | Endpoint              | Purpose                                                  |
| ------ | --------------------- | -------------------------------------------------------- |
| GET    | `/api/v1/tasks`       | Search, filter, sort, and paginate tasks                 |
| GET    | `/api/v1/tasks/stats` | Global total, pending, in-progress, and completed counts |
| GET    | `/api/v1/tasks/:id`   | Retrieve task details                                    |
| POST   | `/api/v1/tasks`       | Create a task; returns 201                               |
| PATCH  | `/api/v1/tasks/:id`   | Update supplied task fields                              |
| DELETE | `/api/v1/tasks/:id`   | Delete a task; returns 204 without a body                |
| GET    | `/api/v1/health`      | Check API/database readiness; returns 200 or 503         |

The task-list endpoint returns `data.tasks` and `data.pagination`. Dashboard statistics use the separate `/tasks/stats` endpoint, which accepts no query parameters. The frontend refreshes both after successful CRUD operations; changing list controls refreshes only the task list.

List query parameters:

| Parameter   | Supported values / behavior                                           |
| ----------- | --------------------------------------------------------------------- |
| `search`    | Case-insensitive literal title/description search; max 150 characters |
| `status`    | `pending`, `in_progress`, `completed`                                 |
| `priority`  | `low`, `medium`, `high`                                               |
| `sortBy`    | `createdAt` (default), `dueDate`, `priority`                          |
| `sortOrder` | `asc`, `desc` (default)                                               |
| `page`      | Positive integer; default `1`                                         |
| `limit`     | Integer from `1–100`; default `12`                                    |

Pagination includes `page`, `limit`, `total`, and `totalPages`. Priority sorts from low to high in ascending order; undated tasks sort last by due date. Unknown or repeated query parameters are rejected.

Task fields: required trimmed `title` (1–150 characters), optional `description` (max 1000), `status` (default `pending`), `priority` (default `medium`), and optional ISO `dueDate`. Send `null` to clear a due date. Timestamps are managed automatically.

Responses use `{ success, message, data }`; errors use `{ success: false, message, errors }`. Validation failures return 400, missing tasks 404, and rate-limit failures 429. Swagger includes request/response schemas, examples, and error responses.

## Validation and tests

```bash
npm run lint
npm run build
npm test
npm run test:ui
```

The suite includes **14 API tests** and **10 browser tests** covering CRUD, persistence, validation, pagination, statistics, notifications, failure recovery, and responsive layouts. Tests use isolated MongoDB processes; the first run may download a MongoDB binary.

Browser tests use dedicated ports **13000/18000** and Microsoft Edge. On Ubuntu or another machine without Edge, remove `channel: "msedge"` from `playwright.config.js` and install Chromium:

```bash
npx playwright install --with-deps chromium
npm run test:ui
```

## Production build

```bash
npm run build
npm start
```

The build outputs `client/dist`; `npm start` starts only the backend. Set `NODE_ENV=production`, serve the frontend through an HTTPS web server, and proxy `/api/v1` to the backend on port 8000. Set `VITE_API_BASE_URL=/api/v1` before building for this same-origin setup. Both development servers bind to loopback; `npm run dev` is for local development.

## Scope and limitation

- **Authentication and roles:** excluded for the shared-workspace assessment.
- **Real-time collaboration:** excluded because request-based updates meet the POC requirements.
- **Email/push notifications:** excluded to avoid external services and background scheduling.

Regex search and offset pagination can become slow on large datasets; larger deployments would need indexed search and query-performance improvements. This assessment POC is intended for a shared task workspace, not private per-user data.
