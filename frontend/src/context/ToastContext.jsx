import { createContext, useContext, useCallback, useState } from "react";

/*
  A small, self-contained notification system. Any component can call
  showToast("Added to cart") and a little message pops up bottom-left
  and disappears on its own — no wiring per-component beyond that one
  function call. (Bottom-left on purpose: the chat widget lives
  bottom-right, so they never overlap.)
*/
const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = "success") => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 2600);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="toast-stack">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast toast-${toast.type}`}>
            <i className={toast.type === "error" ? "fas fa-circle-exclamation" : "fas fa-circle-check"}></i>
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}
