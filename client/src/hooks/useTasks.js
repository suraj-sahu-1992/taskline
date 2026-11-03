import { useCallback, useEffect, useState } from "react";
import { taskApi, errorMessage } from "../services/api";
// Debounce search while fetching page, filter, and sort changes immediately.
export function useTasks(filters, onPageChange) {
  const [search, setSearch] = useState(filters.search);
  const [state, setState] = useState({
    tasks: [],
    pagination: null,
    key: "",
    error: "",
  });
  const [revision, setRevision] = useState(0);
  // Invalidate the current query after mutations without changing its filters.
  const refresh = useCallback(() => setRevision((value) => value + 1), []);
  const { status, priority, sortBy, sortOrder, page, limit } = filters;
  const key = JSON.stringify([
    search,
    status,
    priority,
    sortBy,
    sortOrder,
    page,
    limit,
    revision,
  ]);
  // Typing cancels the previous delay without delaying navigation controls.
  useEffect(() => {
    const timer = setTimeout(() => setSearch(filters.search), 250);
    return () => clearTimeout(timer);
  }, [filters.search]);
  useEffect(() => {
    const controller = new AbortController();
    if (search !== filters.search) return () => controller.abort();
    // Ignore obsolete results and recover pages emptied by updates/deletions.
    async function loadPage() {
      try {
        const data = await taskApi.list(
          Object.fromEntries(
            Object.entries({
              search,
              status,
              priority,
              sortBy,
              sortOrder,
              page,
              limit,
            }).filter(([, value]) => value !== ""),
          ),
          controller.signal,
        );
        if (controller.signal.aborted) return;
        if (page > data.pagination.totalPages) {
          onPageChange(data.pagination.totalPages);
          return;
        }
        setState({ ...data, key, error: "" });
      } catch (error) {
        if (!controller.signal.aborted)
          setState((previous) => ({
            ...previous,
            key,
            error: errorMessage(error),
          }));
      }
    }
    loadPage();
    return () => controller.abort();
  }, [
    search,
    filters.search,
    status,
    priority,
    sortBy,
    sortOrder,
    page,
    limit,
    key,
    onPageChange,
  ]);
  return {
    ...state,
    loading: search !== filters.search || state.key !== key,
    refresh,
  };
}
