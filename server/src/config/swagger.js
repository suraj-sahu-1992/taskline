import { STATUSES, PRIORITIES } from "../constants/task.js";
// Reference a reusable OpenAPI component schema.
const ref = (name) => ({ $ref: `#/components/schemas/${name}` });
// Wrap a schema in the OpenAPI JSON media-type shape.
const json = (schema) => ({ "application/json": { schema } });
// Describe a consistent public API error and example response.
const error = (description) => ({
  description,
  content: {
    "application/json": {
      schema: ref("Error"),
      example: { success: false, message: description, errors: [] },
    },
  },
});
const common = {
  400: {
    description: "Validation failed",
    content: {
      "application/json": {
        schema: ref("Error"),
        example: {
          success: false,
          message: "Validation failed",
          errors: [{ field: "title", message: "Title is required" }],
        },
      },
    },
  },
  403: error("Origin not allowed"),
  429: error("Too many requests. Please try again shortly."),
  500: error("Something went wrong. Please try again."),
};
const properties = {
  title: {
    type: "string",
    minLength: 1,
    maxLength: 150,
    description: "Trimmed; whitespace-only values are rejected.",
  },
  description: { type: "string", maxLength: 1000, default: "" },
  status: { type: "string", enum: STATUSES, default: "pending" },
  priority: { type: "string", enum: PRIORITIES, default: "medium" },
  dueDate: {
    type: "string",
    nullable: true,
    description:
      "ISO date (YYYY-MM-DD) or ISO timestamp with timezone; null clears the date.",
    example: "2026-12-15",
  },
};
const example = {
  _id: "507f1f77bcf86cd799439011",
  title: "Complete assessment",
  description: "",
  status: "pending",
  priority: "medium",
  dueDate: null,
  createdAt: "2026-11-03T10:00:00.000Z",
  updatedAt: "2026-11-03T10:00:00.000Z",
};
// Wrap response data in the shared success response structure.
const envelope = (data) => ({
  type: "object",
  required: ["success", "message", "data"],
  properties: {
    success: { type: "boolean", enum: [true] },
    message: { type: "string" },
    data,
  },
});
// Describe a successful single-task response with an example.
const taskResponse = (message) => ({
  description: message,
  content: {
    "application/json": {
      schema: envelope(ref("Task")),
      example: { success: true, message, data: example },
    },
  },
});
// Require a JSON request body validated against the named schema.
const body = (name) => ({ required: true, content: json(ref(name)) });
const health = {
  type: "object",
  properties: {
    success: { type: "boolean" },
    message: { type: "string" },
    data: {
      type: "object",
      properties: {
        database: { type: "string", enum: ["connected", "disconnected"] },
      },
    },
  },
};
const listResponse = {
  description: "Tasks retrieved successfully",
  content: {
    "application/json": {
      schema: envelope({
        type: "object",
        properties: {
          tasks: { type: "array", items: ref("Task") },
          pagination: {
            type: "object",
            required: ["page", "limit", "total", "totalPages"],
            properties: {
              page: { type: "integer", minimum: 1 },
              limit: { type: "integer", minimum: 1, maximum: 100 },
              total: { type: "integer", minimum: 0 },
              totalPages: { type: "integer", minimum: 1 },
            },
          },
        },
      }),
      example: {
        success: true,
        message: "Tasks retrieved successfully",
        data: {
          tasks: [example],
          pagination: { page: 1, limit: 12, total: 1, totalPages: 1 },
        },
      },
    },
  },
};
export const openapi = {
  openapi: "3.0.3",
  info: {
    title: "Task Manager API",
    version: "1.0.0",
    description:
      "Shared task workspace without authentication. All callers access the same tasks.",
  },
  servers: [{ url: "/" }],
  components: {
    schemas: {
      TaskStats: {
        type: "object",
        required: ["total", ...STATUSES],
        additionalProperties: false,
        properties: Object.fromEntries(
          ["total", ...STATUSES].map((key) => [
            key,
            { type: "integer", minimum: 0 },
          ]),
        ),
      },
      TaskInput: {
        type: "object",
        additionalProperties: false,
        required: ["title"],
        properties,
      },
      TaskUpdate: {
        type: "object",
        additionalProperties: false,
        minProperties: 1,
        properties,
      },
      Task: {
        type: "object",
        required: [
          "_id",
          "title",
          "description",
          "status",
          "priority",
          "dueDate",
          "createdAt",
          "updatedAt",
        ],
        properties: {
          ...properties,
          _id: { type: "string", pattern: "^[a-fA-F0-9]{24}$" },
          dueDate: { type: "string", format: "date-time", nullable: true },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
        example,
      },
      Error: {
        type: "object",
        required: ["success", "message", "errors"],
        properties: {
          success: { type: "boolean", enum: [false] },
          message: { type: "string" },
          errors: {
            type: "array",
            items: {
              type: "object",
              properties: {
                field: { type: "string" },
                message: { type: "string" },
              },
            },
          },
        },
      },
    },
  },
  paths: {
    "/api/v1/health": {
      get: {
        summary: "Check API and database readiness",
        responses: {
          200: { description: "Healthy", content: json(health) },
          503: { description: "Database unavailable", content: json(health) },
          ...common,
        },
      },
    },
    "/api/v1/tasks": {
      get: {
        summary: "List paginated tasks",
        description:
          "Paginated, literal, case-insensitive search. Undated tasks sort last. Priority asc is low → medium → high. Unknown or repeated query parameters are rejected. Out-of-range pages return no tasks. Empty results have one logical page. Global dashboard counts are available separately at /api/v1/tasks/stats.",
        parameters: [
          {
            name: "page",
            in: "query",
            schema: {
              type: "integer",
              minimum: 1,
              maximum: Math.floor(Number.MAX_SAFE_INTEGER / 100),
              default: 1,
            },
          },
          {
            name: "limit",
            in: "query",
            schema: { type: "integer", minimum: 1, maximum: 100, default: 12 },
          },
          {
            name: "search",
            in: "query",
            schema: { type: "string", maxLength: 150 },
          },
          {
            name: "status",
            in: "query",
            schema: { type: "string", enum: STATUSES },
          },
          {
            name: "priority",
            in: "query",
            schema: { type: "string", enum: PRIORITIES },
          },
          {
            name: "sortBy",
            in: "query",
            schema: {
              type: "string",
              enum: ["createdAt", "dueDate", "priority"],
              default: "createdAt",
            },
          },
          {
            name: "sortOrder",
            in: "query",
            schema: { type: "string", enum: ["asc", "desc"], default: "desc" },
          },
        ],
        responses: { 200: listResponse, ...common },
      },
      post: {
        summary: "Create task",
        requestBody: body("TaskInput"),
        responses: {
          201: taskResponse("Task created successfully"),
          413: error("Request body is too large"),
          ...common,
        },
      },
    },
    "/api/v1/tasks/stats": {
      get: {
        summary: "Get global task statistics",
        description:
          "Workspace-wide counts, independent of task-list filters and pagination. No query parameters are accepted.",
        responses: {
          ...common,
          200: {
            description: "Task statistics retrieved successfully",
            content: {
              "application/json": {
                schema: envelope(ref("TaskStats")),
                example: {
                  success: true,
                  message: "Task statistics retrieved successfully",
                  data: { total: 0, pending: 0, in_progress: 0, completed: 0 },
                },
              },
            },
          },
          400: {
            description: "Unsupported query parameters",
            content: {
              "application/json": {
                schema: ref("Error"),
                example: {
                  success: false,
                  message: "Validation failed",
                  errors: [
                    { field: "query", message: 'Unrecognized key: "status"' },
                  ],
                },
              },
            },
          },
        },
      },
    },
    "/api/v1/tasks/{id}": {
      parameters: [
        {
          name: "id",
          in: "path",
          required: true,
          schema: { type: "string", pattern: "^[a-fA-F0-9]{24}$" },
        },
      ],
      get: {
        summary: "Get task details",
        responses: {
          200: taskResponse("Task retrieved successfully"),
          404: error("Task not found"),
          ...common,
        },
      },
      patch: {
        summary: "Update one or more task fields",
        requestBody: body("TaskUpdate"),
        responses: {
          200: taskResponse("Task updated successfully"),
          404: error("Task not found"),
          413: error("Request body is too large"),
          ...common,
        },
      },
      delete: {
        summary: "Delete task",
        responses: {
          204: { description: "Task deleted; no response body" },
          404: error("Task not found"),
          ...common,
        },
      },
    },
  },
};
