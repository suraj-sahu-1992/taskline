import { useCallback, useEffect, useRef, useState } from "react";

// Manage one replaceable notification, including time remaining while paused.
export function useNotification() {
  const [toast, setToast] = useState(null);
  const timer = useRef(null);
  const timing = useRef({ remaining: 0, started: 0, pauses: new Set() });
  // Dismiss explicitly without leaving a timer that could dismiss a later toast.
  const dismiss = useCallback(() => {
    clearTimeout(timer.current);
    timing.current.pauses.clear();
    setToast(null);
  }, []);
  // Resume only when neither hover nor keyboard focus is active.
  const resume = useCallback(
    (reason) => {
      if (!timing.current.pauses.delete(reason)) return;
      if (timing.current.pauses.size) return;
      clearTimeout(timer.current);
      timing.current.started = Date.now();
      timer.current = setTimeout(dismiss, timing.current.remaining);
    },
    [dismiss],
  );
  // Keep the notification readable during pointer or keyboard interaction.
  const pause = useCallback((reason) => {
    if (!timing.current.pauses.size) {
      clearTimeout(timer.current);
      timing.current.remaining = Math.max(
        0,
        timing.current.remaining - (Date.now() - timing.current.started),
      );
    }
    timing.current.pauses.add(reason);
  }, []);
  // Replace the previous result and grant the latest message a fresh lifetime.
  const notify = useCallback(
    (message, type = "success") => {
      clearTimeout(timer.current);
      timing.current.remaining = type === "error" ? 8000 : 6000;
      timing.current.started = Date.now();
      setToast({ message, type });
      if (!timing.current.pauses.size)
        timer.current = setTimeout(dismiss, timing.current.remaining);
    },
    [dismiss],
  );
  useEffect(() => () => clearTimeout(timer.current), []);
  return { toast, notify, dismiss, pause, resume };
}
