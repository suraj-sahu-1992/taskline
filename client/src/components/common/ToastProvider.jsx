import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { CircleCheck, CircleAlert, X } from "lucide-react";
import { ToastContext } from "../../hooks/toast-context";
import { useNotification } from "../../hooks/useNotification";

// Render notifications in the native dialog top layer when a modal is active.
export function ToastProvider({ children }) {
  const notification = useNotification();
  const [host, setHost] = useState(null);
  const { toast, dismiss, pause, resume } = notification;
  // A portal move removes its old DOM node, so release its hover/focus pauses.
  useEffect(() => {
    resume("hover");
    resume("focus");
  }, [host, resume]);
  const Icon = toast?.type === "error" ? CircleAlert : CircleCheck;
  return (
    <ToastContext.Provider value={{ ...notification, setHost }}>
      {children}
      {toast &&
        createPortal(
          <div
            className={`toast ${toast.type}`}
            role={toast.type === "error" ? "alert" : "status"}
            aria-atomic="true"
            onMouseEnter={() => pause("hover")}
            onMouseLeave={() => resume("hover")}
            onFocusCapture={() => pause("focus")}
            onBlurCapture={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget))
                resume("focus");
            }}
          >
            <Icon size={21} aria-hidden="true" />
            <span>{toast.message}</span>
            <button
              type="button"
              className="icon-button"
              aria-label="Dismiss notification"
              onClick={dismiss}
            >
              <X size={18} />
            </button>
          </div>,
          host || document.body,
        )}
    </ToastContext.Provider>
  );
}
