import { z } from "zod";
import { STATUSES, PRIORITIES } from "../constants/task.js";
const date = z
  .union([z.iso.date(), z.iso.datetime({ offset: true })])
  .nullable();
const fields = {
  title: z.string().trim().min(1, "Title is required").max(150),
  description: z.string().max(1000),
  status: z.enum(STATUSES),
  priority: z.enum(PRIORITIES),
  dueDate: date,
};
export const createTaskSchema = z.strictObject({
  ...fields,
  description: fields.description.optional(),
  status: fields.status.optional(),
  priority: fields.priority.optional(),
  dueDate: date.optional(),
});
export const updateTaskSchema = z
  .strictObject(fields)
  .partial()
  .refine(
    (value) => Object.keys(value).length > 0,
    "Provide at least one field",
  );
export const taskParamsSchema = z.strictObject({
  id: z.string().regex(/^[a-f\d]{24}$/i, "Invalid task ID"),
});
// Dashboard counts are global; no filtering or pagination parameters are accepted.
export const taskStatsQuerySchema = z.strictObject({});
export const taskQuerySchema = z.strictObject({
  page: z.coerce
    .number()
    .int()
    .min(1)
    .max(Math.floor(Number.MAX_SAFE_INTEGER / 100))
    .default(1),
  limit: z.coerce.number().int().min(1).max(100).default(12),
  search: z.string().trim().max(150).optional(),
  status: fields.status.optional(),
  priority: fields.priority.optional(),
  sortBy: z.enum(["createdAt", "dueDate", "priority"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});
