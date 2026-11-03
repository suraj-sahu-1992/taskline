import { useCallback, useState } from "react";
import {
  ArrowDownWideNarrow,
  ArrowUpWideNarrow,
  Check,
  CheckCheck,
  Circle,
  CircleCheck,
  Clock3,
  LayoutGrid,
  List,
  ListTodo,
  LoaderCircle,
  Plus,
  Search,
  SlidersHorizontal,
  Sparkles,
  X,
} from "lucide-react";
import { useTasks } from "./hooks/useTasks";
import { useTaskStats } from "./hooks/useTaskStats";
import { taskApi, errorMessage } from "./services/api";
import { STATUSES, PRIORITIES } from "./constants/tasks";
import { TaskCard } from "./components/tasks/TaskCard";
import { TaskForm } from "./components/tasks/TaskForm";
import { TaskList } from "./components/tasks/TaskList";
import { Pagination } from "./components/tasks/Pagination";
import { useToast } from "./hooks/toast-context";
import { Modal } from "./components/common/Modal";
import { formatDate } from "./utils/date";

const defaults = {
  search: "",
  status: "",
  priority: "",
  sortBy: "createdAt",
  sortOrder: "desc",
  page: 1,
  limit: 12,
};
const statCards = [
  { key: "total", label: "Total tasks", icon: LayoutGrid, color: "violet" },
  { key: "pending", label: "Pending", icon: Circle, color: "amber" },
  { key: "in_progress", label: "In progress", icon: Clock3, color: "blue" },
  { key: "completed", label: "Completed", icon: CircleCheck, color: "green" },
];
// Coordinate the shared dashboard query, task actions, and presentation mode.
export default function App() {
  const [filters, setFilters] = useState(defaults);
  const [viewMode, setViewMode] = useState("cards");
  // Keep the callback stable so query effects do not restart on every render.
  const changePage = useCallback(
    (page) => setFilters((current) => ({ ...current, page })),
    [],
  );
  const { tasks, pagination, loading, error, refresh } = useTasks(
    filters,
    changePage,
  );
  const {
    stats,
    loading: statsLoading,
    error: statsError,
    refresh: refreshStats,
  } = useTaskStats();
  const [dialog, setDialog] = useState(null);
  const [busy, setBusy] = useState(false);
  const { notify } = useToast();
  // Every query change starts from the first page of its new matching results.
  function filter(key, value) {
    setFilters((current) => ({ ...current, [key]: value, page: 1 }));
  }
  // Fetch authoritative task details before opening the details dialog.
  async function view(task) {
    setDialog({ type: "details", task: null });
    try {
      const fresh = await taskApi.get(task._id);
      setDialog((current) =>
        current?.type === "details" ? { ...current, task: fresh } : current,
      );
    } catch (err) {
      setDialog(null);
      notify(errorMessage(err), "error");
    }
  }
  // Refresh only after a confirmed save; retain form values on API failures.
  async function save(data) {
    try {
      if (dialog.task) await taskApi.update(dialog.task._id, data);
      else await taskApi.create(data);
      notify(
        dialog.task
          ? "Task updated successfully."
          : "Task created successfully.",
      );
      setDialog(null);
      if (!dialog.task) changePage(1);
      refresh();
      refreshStats();
    } catch (err) {
      notify(errorMessage(err), "error");
      throw err;
    }
  }
  // Delete only after confirmation, then let the query recover an emptied page.
  async function remove() {
    setBusy(true);
    try {
      await taskApi.delete(dialog.task._id);
      setDialog(null);
      notify("Task deleted successfully.");
      refresh();
      refreshStats();
    } catch (err) {
      notify(errorMessage(err), "error");
    } finally {
      setBusy(false);
    }
  }
  const statsAvailable = !!stats && !statsError;
  const progress = !statsAvailable
    ? null
    : stats.total
      ? Math.round((stats.completed / stats.total) * 100)
      : 0;
  const activeFilters = filters.search || filters.status || filters.priority;
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        Skip to tasks
      </a>
      <aside className="sidebar">
        <a className="brand" href="/" aria-label="Taskline home">
          <span className="brand-mark">
            <CheckCheck size={23} />
          </span>
          taskline<span className="brand-dot">.</span>
        </a>
        <div className="workspace-label">WORKSPACE</div>
        <nav aria-label="Workspace">
          <button
            className="nav-item active"
            onClick={() => setFilters(defaults)}
          >
            <LayoutGrid size={18} />
            Overview
            <span className="nav-count">
              {statsAvailable ? stats.total : "—"}
            </span>
          </button>
        </nav>
        <div className="sidebar-note">
          <span className="note-icon">
            <Sparkles size={19} />
          </span>
          <h3>
            A little focus.
            <br />A lot of progress.
          </h3>
          <p>Make room for what matters, one task at a time.</p>
          <div className="note-decoration" aria-hidden="true">
            <Check size={25} />
          </div>
        </div>
        <div className="workspace-footer">
          <span className="workspace-avatar">W</span>
          <div>
            <strong>My workspace</strong>
            <span>Shared task board</span>
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div>
            <span className="mobile-brand">
              <CheckCheck size={21} />
              Taskline
            </span>
            <span className="breadcrumb">
              Workspace <span>/</span> <strong>Overview</strong>
            </span>
          </div>
          <span className="topbar-caption">
            <span className="dot" />A space to get things done
          </span>
        </header>
        <main id="main">
          <div className="page-heading">
            <div>
              <div className="eyebrow">YOUR DAY, ORGANIZED</div>
              <h1>A little more accomplished.</h1>
              <p>Keep your tasks in sight and your next step clear.</p>
            </div>
            <button
              className="button primary"
              onClick={() => setDialog({ type: "form", task: null })}
            >
              <Plus size={18} />
              New task
            </button>
          </div>
          <section
            className="stats-grid"
            aria-label="Task statistics"
            aria-busy={statsLoading}
          >
            {statCards.map(({ key, label, icon: Icon, color }) => (
              <div className={`stat-card ${color}`} key={key}>
                <div className="stat-label">
                  {label}
                  <span className="stat-icon">
                    <Icon size={18} />
                  </span>
                </div>
                <div className="stat-value">
                  {statsAvailable ? stats[key] : "—"}
                </div>
                <span className="stat-caption">
                  {key === "total"
                    ? "Everything in your workspace"
                    : key === "pending"
                      ? "Ready when you are"
                      : key === "in_progress"
                        ? "Moving things forward"
                        : "One step closer"}
                </span>
              </div>
            ))}
          </section>
          {statsError && (
            <div className="stats-error" role="alert">
              <div>
                <strong>Couldn’t load dashboard statistics</strong>
                <p>{statsError}</p>
              </div>
              <button className="button secondary" onClick={refreshStats}>
                Retry statistics
              </button>
            </div>
          )}
          <section className="progress-strip" aria-label="Completion progress">
            <span className="progress-icon">
              <CheckCheck size={21} />
            </span>
            <div>
              <strong>Small steps, real progress.</strong>
              <span>
                {statsAvailable
                  ? `${stats.completed} of ${stats.total} tasks completed`
                  : statsLoading
                    ? "Loading dashboard statistics…"
                    : "Dashboard statistics unavailable"}
              </span>
            </div>
            <div className="progress-meter">
              <div
                className="progress-track"
                role="progressbar"
                aria-label="Tasks completed"
                aria-valuenow={progress ?? undefined}
                aria-valuetext={
                  progress === null
                    ? "Progress unavailable"
                    : `${progress}% complete`
                }
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <div style={{ width: `${progress ?? 0}%` }} />
              </div>
              <strong>{progress === null ? "—" : `${progress}%`}</strong>
            </div>
          </section>
          <section className="task-section" aria-labelledby="tasks-heading">
            <div className="section-heading">
              <div>
                <h2 id="tasks-heading">
                  Your tasks{" "}
                  <span>
                    {loading || error ? "—" : (pagination?.total ?? 0)}
                  </span>
                </h2>
                <p>A clear view of everything on your plate.</p>
              </div>
              <div className="view-switch" role="group" aria-label="Task view">
                <button
                  aria-pressed={viewMode === "cards"}
                  onClick={() => setViewMode("cards")}
                >
                  <LayoutGrid size={16} />
                  Cards
                </button>
                <button
                  aria-pressed={viewMode === "list"}
                  onClick={() => setViewMode("list")}
                >
                  <List size={16} />
                  List
                </button>
              </div>
            </div>
            <div className="toolbar">
              <label className="search-control">
                <Search size={18} />
                <span className="sr-only">Search tasks</span>
                <input
                  type="search"
                  placeholder="Search tasks…"
                  maxLength={150}
                  value={filters.search}
                  onChange={(e) => filter("search", e.target.value)}
                />
              </label>
              <div className="filter-controls">
                <SlidersHorizontal size={17} className="filter-icon" />
                <label>
                  <span className="sr-only">Filter by status</span>
                  <select
                    value={filters.status}
                    onChange={(e) => filter("status", e.target.value)}
                  >
                    <option value="">All statuses</option>
                    {Object.entries(STATUSES).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span className="sr-only">Filter by priority</span>
                  <select
                    value={filters.priority}
                    onChange={(e) => filter("priority", e.target.value)}
                  >
                    <option value="">All priorities</option>
                    {Object.entries(PRIORITIES).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <span className="toolbar-divider" />
                <label>
                  <span className="sr-only">Sort tasks</span>
                  <select
                    value={filters.sortBy}
                    onChange={(e) => filter("sortBy", e.target.value)}
                  >
                    <option value="createdAt">Created date</option>
                    <option value="dueDate">Due date</option>
                    <option value="priority">Priority</option>
                  </select>
                </label>
                <button
                  className="icon-button sort-direction"
                  aria-label={`Sort ${filters.sortOrder === "desc" ? "ascending" : "descending"}`}
                  title={`Currently ${filters.sortOrder === "desc" ? "descending" : "ascending"}`}
                  onClick={() =>
                    filter(
                      "sortOrder",
                      filters.sortOrder === "desc" ? "asc" : "desc",
                    )
                  }
                >
                  {filters.sortOrder === "desc" ? (
                    <ArrowDownWideNarrow size={18} />
                  ) : (
                    <ArrowUpWideNarrow size={18} />
                  )}
                </button>
              </div>
            </div>
            {activeFilters && (
              <div className="filter-summary">
                Showing matching tasks
                <button onClick={() => setFilters(defaults)}>
                  Clear filters <X size={13} />
                </button>
              </div>
            )}
            <div aria-live="polite" aria-busy={loading}>
              {error ? (
                <div className="empty-state error-state" role="alert">
                  <Circle size={30} />
                  <h3>We couldn’t load your tasks</h3>
                  <p>{error}</p>
                  <button className="button secondary" onClick={refresh}>
                    Try again
                  </button>
                </div>
              ) : loading ? (
                <div className="task-grid">
                  {[1, 2, 3].map((n) => (
                    <div key={n} className="task-skeleton">
                      <span />
                      <span />
                      <span />
                    </div>
                  ))}
                  <span className="sr-only">Loading tasks</span>
                </div>
              ) : tasks.length ? (
                viewMode === "list" ? (
                  <TaskList
                    tasks={tasks}
                    onView={view}
                    onEdit={(task) => setDialog({ type: "form", task })}
                    onDelete={(task) => setDialog({ type: "delete", task })}
                  />
                ) : (
                  <div className="task-grid">
                    {tasks.map((task) => (
                      <TaskCard
                        key={task._id}
                        task={task}
                        onView={view}
                        onEdit={(task) => setDialog({ type: "form", task })}
                        onDelete={(task) => setDialog({ type: "delete", task })}
                      />
                    ))}
                  </div>
                )
              ) : (
                <div className="empty-state">
                  <span className="empty-icon">
                    <ListTodo size={34} />
                  </span>
                  <h3>
                    {activeFilters
                      ? "No tasks match your search"
                      : "A fresh start, a clear mind."}
                  </h3>
                  <p>
                    {activeFilters
                      ? "Try a different keyword or clear your filters."
                      : "Add your first task and turn your plans into progress."}
                  </p>
                  <button
                    className="button primary"
                    onClick={() =>
                      activeFilters
                        ? setFilters(defaults)
                        : setDialog({ type: "form", task: null })
                    }
                  >
                    {activeFilters ? (
                      "Clear filters"
                    ) : (
                      <>
                        <Plus size={17} />
                        Create your first task
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
            <Pagination
              pagination={pagination}
              loading={loading}
              error={error}
              page={filters.page}
              limit={filters.limit}
              onPageChange={changePage}
              onLimitChange={(limit) => filter("limit", limit)}
            />
          </section>
        </main>
      </div>
      {dialog?.type === "form" && (
        <TaskForm
          task={dialog.task}
          onSave={save}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog?.type === "delete" && (
        <Modal
          title="Delete this task?"
          onClose={() => setDialog(null)}
          busy={busy}
        >
          <p className="delete-copy">
            “{dialog.task.title}” will be permanently deleted. This action
            cannot be undone.
          </p>
          <div className="modal-actions">
            <button
              autoFocus
              className="button secondary"
              disabled={busy}
              onClick={() => setDialog(null)}
            >
              Keep task
            </button>
            <button className="button danger" disabled={busy} onClick={remove}>
              {busy && <LoaderCircle size={16} className="spin" />}Delete task
            </button>
          </div>
        </Modal>
      )}
      {dialog?.type === "details" && (
        <Modal title="Task details" onClose={() => setDialog(null)}>
          {dialog.task ? (
            <div className="task-details">
              <div className="detail-badges">
                <span className={`badge status-${dialog.task.status}`}>
                  {STATUSES[dialog.task.status]}
                </span>
                <span className={`priority priority-${dialog.task.priority}`}>
                  {PRIORITIES[dialog.task.priority]} priority
                </span>
              </div>
              <h3>{dialog.task.title}</h3>
              <p>{dialog.task.description || "No description added."}</p>
              <dl>
                <div>
                  <dt>Due date</dt>
                  <dd>{formatDate(dialog.task.dueDate)}</dd>
                </div>
                <div>
                  <dt>Created</dt>
                  <dd>{formatDate(dialog.task.createdAt)}</dd>
                </div>
                <div>
                  <dt>Last updated</dt>
                  <dd>{formatDate(dialog.task.updatedAt)}</dd>
                </div>
              </dl>
              <div className="modal-actions">
                <button
                  className="button primary"
                  onClick={() => setDialog({ ...dialog, type: "form" })}
                >
                  Edit task
                </button>
              </div>
            </div>
          ) : (
            <p className="details-loading">
              <LoaderCircle className="spin" />
              Loading task…
            </p>
          )}
        </Modal>
      )}
    </div>
  );
}
