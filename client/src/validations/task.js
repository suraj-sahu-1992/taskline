import { z } from "zod";
import { STATUSES, PRIORITIES } from "../constants/tasks";
export const taskSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Give your task a title.")
    .max(150, "Use 150 characters or fewer."),
  description: z.string().max(1000, "Use 1,000 characters or fewer."),
  status: z.enum(Object.keys(STATUSES)),
  priority: z.enum(Object.keys(PRIORITIES)),
  dueDate: z.union([
    z.literal(""),
    z.iso.date({ error: "Choose a valid date." }),
  ]),
});
