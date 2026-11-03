# Taskline — MERN Task Manager

A responsive task workspace built for the MERN developer assessment. React + Vite + Tailwind on the frontend; Express + MongoDB/Mongoose on the backend. JavaScript throughout. All task data is persisted in MongoDB. There is no authentication: every caller accesses the same workspace.

## Run locally

Prerequisites: **Node.js 22.19 or newer** (Node 22 LTS recommended), npm, and a running MongoDB 7+ instance or an Atlas connection string. Node 20.17 is too old for the installed tooling.

From PowerShell:

```powershell
cd D:\projects\POC
npm.cmd ci
Copy-Item server/.env.example server/.env
Copy-Item client/.env.example client/.env
# Set MONGODB_URI in server/.env if you are not using local MongoDB.
npm.cmd run dev
```

On macOS/Linux, use `npm` instead of `npm.cmd`, change into your checkout, and use `cp` instead of `Copy-Item`. Start your local MongoDB service before `npm run dev`; installing npm dependencies does not install a persistent MongoDB service.

- Frontend: http://127.0.0.1:3000
- API: http://127.0.0.1:8000/api/v1
- Health: http://127.0.0.1:8000/api/v1/health
- Swagger UI: http://127.0.0.1:8000/api-docs
- OpenAPI JSON: http://127.0.0.1:8000/api-docs/openapi.json

The development API binds to loopback. Stop both servers with Ctrl+C. The default MongoDB URL is `mongodb://127.0.0.1:27017/task_manager`; tasks remain in that database across API restarts and page refreshes. No seed data is inserted automatically.

## Configuration

| Variable            | Default                                          | Purpose                                    |
| ------------------- | ------------------------------------------------ | ------------------------------------------ |
| `PORT`              | `8000`                                           | Backend HTTP port                          |
| `MONGODB_URI`       | `mongodb://127.0.0.1:27017/task_manager`         | Local MongoDB or Atlas URI                 |
| `CORS_ORIGINS`      | `http://127.0.0.1:3000,http://localhost:3000`    | Comma-separated exact allowed origins      |
| `NODE_ENV`          | `development`                                    | `development`, `test`, or `production`     |
| `RATE_LIMIT_MAX`    | `300`                                            | Requests per IP per minute under `/api/v1` |
| `VITE_API_BASE_URL` | `http://127.0.0.1:8000/api/v1` in `.env.example` | Frontend API base URL; build-time setting  |

The server loads `server/.env` regardless of the launch directory. Vite loads `client/.env`. Restart servers after environment changes. Set `VITE_API_BASE_URL` in `client/.env` to your backend URL, including `/api/v1`. If this variable is omitted, Axios falls back to `/api/v1` and Vite proxies development requests to port 8000. If you change `PORT`, update your frontend API URL (and the proxy target if using relative URLs). Never commit `.env` files or credentials.

After initial setup, simply run `npm run dev` from the project root on Windows or Linux. It starts both workspaces. The backend uses Node's built-in `node --watch` to restart on source changes, so Nodemon is unnecessary. Vite supplies frontend hot reload. Use `npm start` for the backend without watch mode.

## Features

- Create, list, view, edit, and delete tasks; deletion requires confirmation.
- Pending / In progress / Completed status and Low / Medium / High priority.
- Optional descriptions and due dates, with overdue indicators.
- Debounced, case-insensitive literal search across title and description.
- Combined status and priority filters; ascending/descending creation, due date, and priority sorting.
- Server-side pagination (12 tasks by default), matching-result counts, numbered navigation, and 12/24/48 page sizes.
- Working Cards / List view controls preserve the current page and query without fetching again.
- Prominent, dismissible CRUD notifications appear at the top-center, including inside open dialogs. Success messages last six seconds and errors eight seconds; hover or keyboard focus pauses dismissal.
- Global dashboard statistics and completion progress, independent of list filters.
- Responsive cards, create/edit forms, task details, toasts, loading skeletons, empty states, recoverable API errors.
- Native modal dialogs provide focus containment and Escape dismissal; focus returns to the opener. Forms have labels, field errors, and visible focus indicators. Reduced-motion preferences are respected.

## Architecture

```text
client/src/
  components/common/     Native dialog wrapper
  components/tasks/      Task cards and React Hook Form form
  constants/             Status and priority labels
  hooks/                 Abortable, debounced task loading
  services/              Axios API boundary
  validations/           Zod form validation
  utils/                 Date formatting and overdue detection
  App.jsx                Dashboard and interaction orchestration
server/src/
  config/                Environment, MongoDB, OpenAPI specification
  constants/             Task enums
  controllers/           HTTP responses and status codes
  services/              Task existence rules and list/stat orchestration
  repositories/          Explicit MongoDB queries and persistence
  models/                Mongoose schema and timestamps
  routes/                Route definitions and validation wiring
  validations/           Strict Zod body, parameter, and query schemas
  middleware/            Validation and centralized error handling
  utils/                 Expected HTTP error type
  app.js                 Express middleware and routes
  server.js              Database-first startup and shutdown
server/test/             Database-backed Node integration tests
tests/                   Playwright browser tests
scripts/ui-server.js     Isolated MongoDB/API fixture for browser tests
```

Request flow: **Route → Validation middleware → Controller → Service → Repository → Mongoose model**. Express 5 forwards rejected async handlers to centralized error middleware. React state and a reusable hook manage the dashboard; there is one screen, so a router or global state framework is unnecessary.

The backend is authoritative: unknown body/query fields, repeated query parameters, invalid ObjectIds, empty updates, invalid dates, and unsupported enums/sorts produce 400 responses. Mongoose provides a second validation layer. Date inputs accept valid ISO dates or timestamps; `null` clears a due date. The UI treats due dates as calendar dates and displays them in UTC to avoid shifting dates between time zones.

Priority is sorted semantically (`low < medium < high`), not alphabetically. Undated tasks always appear last when sorting by due date. `_id` breaks equal-value sort ties. Search escapes regex metacharacters and constructs database queries only from validated fields.

## REST API

| Method | Endpoint              | Result                                       |
| ------ | --------------------- | -------------------------------------------- |
| GET    | `/api/v1/tasks`       | Filtered tasks and pagination metadata       |
| GET    | `/api/v1/tasks/stats` | Global dashboard task counts                 |
| GET    | `/api/v1/tasks/:id`   | Task details                                 |
| POST   | `/api/v1/tasks`       | Create task, 201                             |
| PATCH  | `/api/v1/tasks/:id`   | Update supplied fields, 200                  |
| DELETE | `/api/v1/tasks/:id`   | Delete task, 204 with no body                |
| GET    | `/api/v1/health`      | 200 when MongoDB is connected; otherwise 503 |

List query parameters: `search` (max 150 chars), `status` (`pending`, `in_progress`, `completed`), `priority` (`low`, `medium`, `high`), `sortBy` (`createdAt`, `dueDate`, `priority`; default `createdAt`), `sortOrder` (`asc`, `desc`; default `desc`), `page` (positive integer; default `1`), and `limit` (integer 1–100; default `12`). Repeated parameters are rejected. Very large page values that could produce unsafe JavaScript offsets are also rejected.

The list response includes `data.pagination`: `{ "page": 1, "limit": 12, "total": 35, "totalPages": 3 }`. `total` counts all matches for the active filters. Out-of-range pages return an empty task array, and an empty result has one logical page. Sorting uses `_id` as a stable tie-breaker before slicing. The matching count and page are produced by one aggregation facet; this endpoint does not query dashboard statistics.

`GET /api/v1/tasks/stats` returns global counts in `{ "success": true, "message": "Task statistics retrieved successfully", "data": { "total": 0, "pending": 0, "in_progress": 0, "completed": 0 } }`. It accepts no query parameters; unsupported parameters return HTTP 400. The static `/stats` route is registered before `/:id`.

Frontend list and statistics hooks load independently. Successful create/update/delete operations refresh both; search, filters, sorting, pagination, and Cards/List changes do not refetch statistics. Each resource has its own loading/error/retry state. Existing counts remain visible during a statistics refresh; on failure, counts/progress display as unavailable and offer a dedicated retry without hiding tasks. A failed statistics refresh never changes a successful mutation notification into an error.

Query changes reset the frontend to page 1; only search is debounced. Creation returns to page 1 while retaining filters. Updates/deletions retain the page and recover to the last valid page if it becomes empty. An active filter can hide a newly created task; the success notification confirms it was saved.

Task fields: required trimmed `title` (1–150 chars), optional `description` (max 1000), `status` (default `pending`), `priority` (default `medium`), optional `dueDate`. MongoDB manages `_id`; Mongoose manages `createdAt` and `updatedAt`.

Successful responses use `{ "success": true, "message": "...", "data": ... }`. The list endpoint's data contains only `{ "tasks": [...], "pagination": { "page": 1, "limit": 12, "total": 0, "totalPages": 1 } }`; dashboard consumers must call `/api/v1/tasks/stats` instead of reading `data.stats`. Errors use `{ "success": false, "message": "...", "errors": [{ "field": "title", "message": "Title is required" }] }`. Unknown tasks return 404, rejected origins 403, oversized bodies 413, and rate-limited clients 429. Internal errors return a generic 500 response without a stack trace.

Example (PowerShell):

```powershell
Invoke-RestMethod http://127.0.0.1:8000/api/v1/tasks -Method Post -ContentType 'application/json' -Body '{"title":"Complete assessment","priority":"high"}'
Invoke-RestMethod 'http://127.0.0.1:8000/api/v1/tasks?sortBy=priority&sortOrder=desc'
```

Swagger uses a maintained OpenAPI 3.0.3 JavaScript definition directly, avoiding comment parsing. It documents request/response schemas, query enums, examples, and errors. Integration tests validate the specification with Swagger Parser.

## Security choices

Helmet, a configurable CORS allowlist, 16 KB JSON body limit, compression, and API rate limiting are enabled. Express uses the simple query parser and Zod rejects arrays/repeated values and unknown keys; this supplies parameter-pollution protection without HPP middleware that mutates Express 5's read-only query getter. React escapes text; the application does not render raw task HTML. No `xss-clean` or credentials are used.

CORS is a browser control, not authentication. This is a shared assessment workspace, not an individually private task store. The in-memory rate limiter is appropriate for a single process.

## Checks

Verification completed on November 3, 2026 using Node 24.22.2: ESLint passed, the frontend production build passed, all 14 MongoDB-backed API tests passed, and all 10 Microsoft Edge browser tests passed. Checks include the separate statistics contract, independent loading/failure/retry behavior, statistics request counts across list controls and CRUD, API startup, reconnect/page-refresh persistence, pagination and page recovery, both task views, dialog-visible CRUD notifications, timer pauses, Swagger, and desktop/tablet/mobile layouts. Tests use isolated MongoDB processes; normal development uses your configured MongoDB service or Atlas connection.

The runtime dependency audit reported zero vulnerabilities. The full audit reported six moderate development-tool advisories through ESLint/minimatch, with no automatic compatible fix reported at verification time.

```powershell
npm.cmd run lint
npm.cmd run build
npm.cmd test
npm.cmd run test:ui
```

API tests launch a real isolated MongoDB process using `mongodb-memory-server` (a development-only fixture), and cover CRUD, reconnect persistence, defaults, validation, search, both sort directions, statistics, malformed JSON, size limits, CORS, rate limiting, safe errors, OpenAPI, and actual server-entry-point startup. The first run may download a MongoDB binary. They do not access your configured application database.

Browser tests launch their own API and Vite on dedicated ports **18000 and 13000**, leaving the normal development app on **8000 and 3000** untouched. Their API connects only to a real isolated MongoDB process. They cover pagination, Cards/List switching, mutation notifications and modal error visibility, timer pauses, validation, CRUD, refresh persistence, filters/sorting, keyboard focus, recovery, and 1440/768/390 px layouts. The config uses installed Microsoft Edge (`channel: 'msedge'`). On systems without Edge, remove `channel` in `playwright.config.js`, run `npx playwright install chromium`, and rerun. Screenshots go to ignored `test-results/`.

Production bundle: `npm run build` produces `client/dist`. Run the backend with `npm start`. To preview the bundle locally, set `VITE_API_BASE_URL=http://127.0.0.1:8000/api/v1` before building, add `http://localhost:4173` and/or `http://127.0.0.1:4173` to `CORS_ORIGINS`, then run `npm run preview -w client`. Production hosting should serve the frontend and proxy `/api/v1` to the backend; a Vite development proxy is not part of the built bundle.

## Scope and limitations

Three deliberately excluded features:

1. Authentication and roles: outside the single shared-workspace assessment scope.
2. Live collaboration/WebSockets: normal API refresh after mutations is sufficient for the POC.
3. Email/push notifications: avoids external services and background scheduling unrelated to CRUD.

The main implementation limitation is **regex search and offset pagination on large datasets**. Paginated responses bound transfer size, but search and computed priority/due-date ordering can still scan/sort many records. Large deployments would need search indexing, query-performance work, and potentially cursor pagination. The filtered count and task page share an aggregation; global statistics are a separate read, so simultaneous external writers can briefly produce a mismatched dashboard snapshot. Refresh reconciles it.

No assessment video or video script is included.
