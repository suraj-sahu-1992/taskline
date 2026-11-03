import { useCallback, useEffect, useState } from "react";
import { taskApi, errorMessage } from "../services/api";

// Load dashboard counts only on mount, explicit retry, or confirmed mutations.
export function useTaskStats() {
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState({ stats: null, revision: -1, error: "" });
  // Keep retry/mutation invalidation independent from the paginated list query.
  const refresh = useCallback(() => setRevision((value) => value + 1), []);
  useEffect(() => {
    const controller = new AbortController();
    // Retain last-known counts during refresh and ignore cancelled responses.
    async function loadStats() {
      try {
        const stats = await taskApi.stats(controller.signal);
        if (!controller.signal.aborted)
          setState({ stats, revision, error: "" });
      } catch (error) {
        if (!controller.signal.aborted)
          setState((previous) => ({
            ...previous,
            revision,
            error: errorMessage(error),
          }));
      }
    }
    loadStats();
    return () => controller.abort();
  }, [revision]);
  const loading = state.revision !== revision;
  return {
    stats: state.stats,
    loading,
    error: loading ? "" : state.error,
    refresh,
  };
}
