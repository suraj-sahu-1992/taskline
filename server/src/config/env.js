import dotenv from "dotenv";
import { fileURLToPath } from "node:url";
import { z } from "zod";
dotenv.config({
  path: fileURLToPath(new URL("../../.env", import.meta.url)),
  quiet: true,
});
const schema = z.object({
  PORT: z.coerce.number().int().min(1).max(65535).default(8000),
  MONGODB_URI: z
    .string()
    .regex(/^mongodb(?:\+srv)?:\/\//)
    .default("mongodb://127.0.0.1:27017/task_manager"),
  CORS_ORIGINS: z
    .string()
    .default("http://127.0.0.1:3000,http://localhost:3000"),
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(300),
});
const result = schema.safeParse(process.env);
if (!result.success)
  throw new Error(
    `Invalid environment configuration: ${result.error.issues.map((i) => i.path.join(".")).join(", ")}`,
  );
export const env = result.data;
