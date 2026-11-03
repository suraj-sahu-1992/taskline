import { Task } from "../models/task.model.js";
export const taskRepository = {
  // Fetch one sorted page and its matching count in the same aggregation.
  async list({ search, status, priority, sortBy, sortOrder, page, limit }) {
    const filter = {};
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (search) {
      const literal = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      filter.$or = [
        { title: { $regex: literal, $options: "i" } },
        { description: { $regex: literal, $options: "i" } },
      ];
    }
    const direction = sortOrder === "asc" ? 1 : -1;
    // Missing dates always sort last; priority uses semantic rather than alphabetical order.
    const [result] = await Task.aggregate([
      { $match: filter },
      {
        $addFields: {
          _priority: {
            $indexOfArray: [["low", "medium", "high"], "$priority"],
          },
          _undated: {
            $cond: [{ $eq: [{ $ifNull: ["$dueDate", null] }, null] }, 1, 0],
          },
        },
      },
      {
        $facet: {
          tasks: [
            {
              $sort: {
                ...(sortBy === "dueDate" ? { _undated: 1 } : {}),
                [sortBy === "priority" ? "_priority" : sortBy]: direction,
                _id: direction,
              },
            },
            { $skip: (page - 1) * limit },
            { $limit: limit },
            { $project: { _priority: 0, _undated: 0 } },
          ],
          count: [{ $count: "total" }],
        },
      },
    ]);
    return { tasks: result.tasks, total: result.count[0]?.total ?? 0 };
  },
  // Dashboard counts intentionally ignore list filters and pagination.
  async stats() {
    const groups = await Task.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);
    const stats = { total: 0, pending: 0, in_progress: 0, completed: 0 };
    for (const group of groups) {
      stats[group._id] = group.count;
      stats.total += group.count;
    }
    return stats;
  },
  // Read a plain task document without Mongoose instance overhead.
  findById: (id) => Task.findById(id).lean(),
  // Persist only fields accepted by the request validator.
  create: (data) => Task.create(data),
  // Reapply schema validation and return the updated document.
  update: (id, data) =>
    Task.findByIdAndUpdate(
      id,
      { $set: data },
      { returnDocument: "after", runValidators: true },
    ).lean(),
  // Return the removed document so the service can detect missing tasks.
  delete: (id) => Task.findByIdAndDelete(id).lean(),
};
