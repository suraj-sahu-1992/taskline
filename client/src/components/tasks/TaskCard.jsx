import { ArrowUpRight, CalendarDays, Pencil, Trash2 } from "lucide-react";
import { STATUSES, PRIORITIES } from "../../constants/tasks";
import { formatDate, isOverdue } from "../../utils/date";
// Display a task summary with details, edit, and confirmed-delete entry points.
export function TaskCard({ task, onView, onEdit, onDelete }) {
  return (
    <article className={`task-card ${task.status}`}>
      <div className="card-top">
        <span className={`badge status-${task.status}`}>
          <span className="dot" />
          {STATUSES[task.status]}
        </span>
        <span className={`priority priority-${task.priority}`}>
          <span className="priority-bars">▂▅▇</span>
          {PRIORITIES[task.priority]}
        </span>
      </div>
      <button className="task-title" onClick={() => onView(task)}>
        {task.title}
        <ArrowUpRight size={17} />
      </button>
      <p className="task-description">
        {task.description || "No description added."}
      </p>
      <div className="card-bottom">
        <span className={`due-date ${isOverdue(task) ? "overdue" : ""}`}>
          <CalendarDays size={14} />
          {formatDate(task.dueDate)}
          {isOverdue(task) && <span className="sr-only"> (overdue)</span>}
        </span>
        <div className="card-actions">
          <button
            className="icon-button"
            aria-label={`Edit ${task.title}`}
            onClick={() => onEdit(task)}
          >
            <Pencil size={16} />
          </button>
          <button
            className="icon-button danger-icon"
            aria-label={`Delete ${task.title}`}
            onClick={() => onDelete(task)}
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </article>
  );
}
