import { createContext, useContext } from "react";
export const ToastContext = createContext(null);

// Access the shared notification and active-dialog host from application code.
export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast requires ToastProvider");
  return context;
}
