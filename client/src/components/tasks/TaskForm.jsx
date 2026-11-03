import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { LoaderCircle } from "lucide-react";
import { taskSchema } from "../../validations/task";
import { STATUSES, PRIORITIES } from "../../constants/tasks";
import { Modal } from "../common/Modal";
// Manage create/edit values and field errors with React Hook Form and Zod.
export function TaskForm({ task, onClose, onSave }) {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: task?.title || "",
      description: task?.description || "",
      status: task?.status || "pending",
      priority: task?.priority || "medium",
      dueDate: task?.dueDate?.slice(0, 10) || "",
    },
  });
  // Normalize the optional date and map authoritative API field errors back to inputs.
  async function submit(values) {
    try {
      await onSave({ ...values, dueDate: values.dueDate || null });
    } catch (error) {
      for (const issue of error.response?.data?.errors || [])
        if (
          ["title", "description", "status", "priority", "dueDate"].includes(
            issue.field,
          )
        )
          setError(issue.field, { message: issue.message });
    }
  }
  // Connect an input to form state and its accessible validation feedback.
  const field = (name) => ({
    ...register(name),
    "aria-invalid": !!errors[name],
    "aria-describedby": errors[name] ? `${name}-error` : undefined,
  });
  // Render the validation message associated with a particular form field.
  const feedback = (name) =>
    errors[name] && (
      <span className="field-error" id={`${name}-error`}>
        {errors[name].message}
      </span>
    );
  return (
    <Modal
      title={task ? "Edit task" : "Create a task"}
      onClose={onClose}
      busy={isSubmitting}
    >
      <p className="modal-intro">A clear next step makes all the difference.</p>
      <form onSubmit={handleSubmit(submit)} noValidate>
        <fieldset disabled={isSubmitting} className="form-fields">
          <label>
            Task title <span className="required">*</span>
            <input
              autoFocus
              placeholder="What needs to get done?"
              maxLength={150}
              {...field("title")}
            />
            {feedback("title")}
          </label>
          <label>
            Description <span className="optional">Optional</span>
            <textarea
              rows={4}
              placeholder="Add a little context…"
              maxLength={1000}
              {...field("description")}
            />
            {feedback("description")}
          </label>
          <div className="form-row">
            <label>
              Status
              <select {...field("status")}>
                {Object.entries(STATUSES).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              {feedback("status")}
            </label>
            <label>
              Priority
              <select {...field("priority")}>
                {Object.entries(PRIORITIES).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              {feedback("priority")}
            </label>
          </div>
          <label>
            Due date <span className="optional">Optional</span>
            <input type="date" {...field("dueDate")} />
            {feedback("dueDate")}
          </label>
        </fieldset>
        <div className="modal-actions">
          <button
            type="button"
            className="button secondary"
            disabled={isSubmitting}
            onClick={onClose}
          >
            Cancel
          </button>
          <button className="button primary" disabled={isSubmitting}>
            {isSubmitting && <LoaderCircle size={16} className="spin" />}
            {task ? "Save changes" : "Create task"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
