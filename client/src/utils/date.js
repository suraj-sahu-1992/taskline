// Display stored dates in UTC so calendar due dates do not shift time zones.
export function formatDate(value) {
  return value
    ? new Intl.DateTimeFormat("en", {
        month: "short",
        day: "numeric",
        year: "numeric",
        timeZone: "UTC",
      }).format(new Date(value))
    : "No due date";
}
// Compare unfinished calendar due dates with the user’s local calendar date.
export function isOverdue(task) {
  return (
    task.dueDate &&
    task.status !== "completed" &&
    task.dueDate.slice(0, 10) < new Date().toLocaleDateString("en-CA")
  );
}
