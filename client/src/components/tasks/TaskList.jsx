import { Pencil, Trash2 } from "lucide-react";
import { STATUSES, PRIORITIES } from "../../constants/tasks";
import { formatDate, isOverdue } from "../../utils/date";

// Present the same task page as compact rows with all task actions available.
export function TaskList({ tasks, onView, onEdit, onDelete }) {
  return (
    <div className="task-list" role="table" aria-label="Task list">
      <div className="task-list-header" role="row">
        <span role="columnheader">Task</span>
        <span role="columnheader">Status</span>
        <span role="columnheader">Priority</span>
        <span role="columnheader">Due date</span>
        <span role="columnheader">Actions</span>
      </div>
      {tasks.map((task) => (
        <div className="task-list-row" role="row" key={task._id}>
          <div role="cell" className="list-title">
            <button onClick={() => onView(task)}>{task.title}</button>
            <p>{task.description || "No description added."}</p>
          </div>
          <div role="cell">
            <span className={`badge status-${task.status}`}>
              <span className="dot" />
              {STATUSES[task.status]}
            </span>
          </div>
          <div role="cell">
            <span className={`priority priority-${task.priority}`}>
              {PRIORITIES[task.priority]}
              <span className="sr-only"> priority</span>
            </span>
          </div>
          <div
            role="cell"
            className={`due-date ${isOverdue(task) ? "overdue" : ""}`}
          >
            {formatDate(task.dueDate)}
            {isOverdue(task) && <span className="sr-only"> (overdue)</span>}
          </div>
          <div role="cell" className="list-actions">
            <button
              className="icon-button"
              aria-label={`Edit ${task.title}`}
              onClick={() => onEdit(task)}
            >
              <Pencil size={17} />
            </button>
            <button
              className="icon-button danger-icon"
              aria-label={`Delete ${task.title}`}
              onClick={() => onDelete(task)}
            >
              <Trash2 size={17} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
