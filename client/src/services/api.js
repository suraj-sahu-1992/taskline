import axios from "axios";
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "/api/v1",
  timeout: 10000,
});
export const taskApi = {
  // Load a filtered task page and pagination metadata; support request cancellation.
  async list(params, signal) {
    return (await api.get("/tasks", { params, signal })).data.data;
  },
  // Load unfiltered workspace counts independently of task-list controls.
  async stats(signal) {
    return (await api.get("/tasks/stats", { signal })).data.data;
  },
  // Fetch fresh task details by identifier.
  async get(id) {
    return (await api.get(`/tasks/${id}`)).data.data;
  },
  // Submit a new task and unwrap the success response.
  async create(data) {
    return (await api.post("/tasks", data)).data.data;
  },
  // Send partial task changes and unwrap the updated record.
  async update(id, data) {
    return (await api.patch(`/tasks/${id}`, data)).data.data;
  },
  // Delete a task without expecting a response body.
  async delete(id) {
    await api.delete(`/tasks/${id}`);
  },
};
// Prefer the safe API message and fall back to a useful connection error.
export const errorMessage = (error) =>
  error.response?.data?.message ||
  "Unable to reach the server. Check your connection and try again.";
