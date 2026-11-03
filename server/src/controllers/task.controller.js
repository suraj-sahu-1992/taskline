import { taskService as service } from "../services/task.service.js";
export const taskController = {
  // Return the paginated task query without loading dashboard statistics.
  async list(req, res) {
    res.json({
      success: true,
      message: "Tasks retrieved successfully",
      data: await service.list(req.validated.query),
    });
  },
  // Return independent workspace-wide task counts in the shared success envelope.
  async stats(_req, res) {
    res.json({
      success: true,
      message: "Task statistics retrieved successfully",
      data: await service.stats(),
    });
  },
  // Return task details for the validated identifier.
  async get(req, res) {
    res.json({
      success: true,
      message: "Task retrieved successfully",
      data: await service.get(req.validated.params.id),
    });
  },
  // Return the created task with HTTP 201.
  async create(req, res) {
    res.status(201).json({
      success: true,
      message: "Task created successfully",
      data: await service.create(req.validated.body),
    });
  },
  // Return the task after applying validated partial changes.
  async update(req, res) {
    res.json({
      success: true,
      message: "Task updated successfully",
      data: await service.update(req.validated.params.id, req.validated.body),
    });
  },
  // Confirm deletion with HTTP 204 and no response body.
  async delete(req, res) {
    await service.delete(req.validated.params.id);
    res.status(204).end();
  },
};
