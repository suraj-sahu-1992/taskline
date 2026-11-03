import express from "express";
import mongoose from "mongoose";
import helmet from "helmet";
import cors from "cors";
import compression from "compression";
import { rateLimit } from "express-rate-limit";
import swaggerUi from "swagger-ui-express";
import { env } from "./config/env.js";
import { openapi } from "./config/swagger.js";
import { taskRouter } from "./routes/task.routes.js";
import { errorHandler } from "./middleware/error-handler.js";
import { ApiError } from "./utils/api-error.js";
export const app = express();
// Avoid advertising the server framework through a response header.
app.disable("x-powered-by");
// Keep query values flat; strict Zod schemas reject repeated/unknown keys.
app.set("query parser", "simple");
// Helmet adds defensive HTTP headers such as MIME-sniffing and framing protection.
app.use(helmet());
// Negotiate compressed responses to reduce JSON/documentation transfer sizes.
app.use(compression());
const origins = env.CORS_ORIGINS.split(",").map((value) => value.trim());
app.use(
  // Allow configured browser origins; this is not an authentication boundary.
  cors({
    // Reject browser origins outside the configured allowlist while allowing server clients.
    origin(origin, callback) {
      callback(
        origin && !origins.includes(origin)
          ? new ApiError(403, "Origin not allowed")
          : null,
        true,
      );
    },
  }),
);
// Bound parsing work and reject unexpectedly large JSON request bodies.
app.use(express.json({ limit: "16kb" }));
app.use(
  "/api/v1",
  // A single-process per-IP limiter provides basic API abuse protection.
  rateLimit({
    windowMs: 60_000,
    limit: env.RATE_LIMIT_MAX,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: {
      success: false,
      message: "Too many requests. Please try again shortly.",
      errors: [],
    },
  }),
);
// Readiness includes MongoDB so a running HTTP listener alone is not healthy.
app.get("/api/v1/health", (_req, res) => {
  const connected = mongoose.connection.readyState === 1;
  res.status(connected ? 200 : 503).json({
    success: connected,
    message: connected ? "Service is healthy" : "Database unavailable",
    data: { database: connected ? "connected" : "disconnected" },
  });
});
app.use("/api/v1/tasks", taskRouter);
app.get("/api-docs/openapi.json", (_req, res) => res.json(openapi));
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(openapi));
app.use((_req, _res, next) => next(new ApiError(404, "Endpoint not found")));
// Final middleware maps failures to safe, consistent public responses.
app.use(errorHandler);
