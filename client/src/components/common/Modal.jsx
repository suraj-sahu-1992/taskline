import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { useToast } from "../../hooks/toast-context";
// Contain keyboard focus, restore the opener, and host dialog-visible toasts.
export function Modal({ title, children, onClose, busy = false }) {
  const ref = useRef(null);
  const { setHost } = useToast();
  useEffect(() => {
    const previous = document.activeElement;
    const dialog = ref.current;
    dialog.showModal();
    setHost(dialog);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      dialog.close();
      setHost(null);
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, [setHost]);
  return (
    <dialog
      ref={ref}
      aria-labelledby="dialog-title"
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onClose();
      }}
      className="modal"
    >
      <div className="modal-heading">
        <h2 id="dialog-title">{title}</h2>
        <button
          type="button"
          className="icon-button"
          aria-label="Close dialog"
          disabled={busy}
          onClick={onClose}
        >
          <X size={20} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
