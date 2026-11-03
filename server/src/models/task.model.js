import mongoose from "mongoose";
import { STATUSES, PRIORITIES } from "../constants/task.js";
const schema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 150 },
    description: { type: String, maxlength: 1000, default: "" },
    status: { type: String, enum: STATUSES, default: "pending" },
    priority: { type: String, enum: PRIORITIES, default: "medium" },
    dueDate: { type: Date, default: null },
  },
  { timestamps: true, versionKey: false },
);
schema.index({ createdAt: -1 });
export const Task = mongoose.model("Task", schema);
