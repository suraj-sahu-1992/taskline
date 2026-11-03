import { taskRepository as repository } from "../repositories/task.repository.js";
import { ApiError } from "../utils/api-error.js";
// Translate absent database records into the public not-found response.
const requireTask = (task) => {
  if (!task) throw new ApiError(404, "Task not found");
  return task;
};
export const taskService = {
  // Return only the filtered page and its matching-result pagination metadata.
  async list(query) {
    const { tasks, total } = await repository.list(query);
    return {
      tasks,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / query.limit)),
      },
    };
  },
  // Read global counts independently of filters and paginated list requests.
  stats: () => repository.stats(),
  // Require an existing task before returning its details.
  async get(id) {
    return requireTask(await repository.findById(id));
  },
  // Delegate validated task creation to persistence.
  create: (data) => repository.create(data),
  // Reject updates targeting records that no longer exist.
  async update(id, data) {
    return requireTask(await repository.update(id, data));
  },
  // Reject repeated deletion of a missing record.
  async delete(id) {
    return requireTask(await repository.delete(id));
  },
};
