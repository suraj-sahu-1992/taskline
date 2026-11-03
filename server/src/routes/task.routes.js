import { Router } from "express";
import { taskController as controller } from "../controllers/task.controller.js";
import { validate } from "../middleware/validate.js";
import {
  createTaskSchema,
  updateTaskSchema,
  taskParamsSchema,
  taskQuerySchema,
  taskStatsQuerySchema,
} from "../validations/task.validation.js";
export const taskRouter = Router();
taskRouter.get("/", validate({ query: taskQuerySchema }), controller.list);
taskRouter.post("/", validate({ body: createTaskSchema }), controller.create);

// Static paths must precede /:id so "stats" is not parsed as an ObjectId.
taskRouter.get(
  "/stats",
  validate({ query: taskStatsQuerySchema }),
  controller.stats,
);
taskRouter.get("/:id", validate({ params: taskParamsSchema }), controller.get);
taskRouter.patch(
  "/:id",
  validate({ params: taskParamsSchema, body: updateTaskSchema }),
  controller.update,
);
taskRouter.delete(
  "/:id",
  validate({ params: taskParamsSchema }),
  controller.delete,
);
