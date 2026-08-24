"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Info, 
  X 
} from "lucide-react";

export type ToastType = "success" | "error" | "warning" | "info";

export interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

interface ToastContextType {
  showToast: (toast: Omit<ToastItem, "id"> | string, type?: ToastType) => void;
  success: (titleOrMessage: string, message?: string) => void;
  error: (titleOrMessage: string, message?: string) => void;
  warning: (titleOrMessage: string, message?: string) => void;
  info: (titleOrMessage: string, message?: string) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

let globalToastEmitter: ((toast: Omit<ToastItem, "id">) => void) | null = null;

// Global toast helper that can be called even outside React components
export const toast = {
  success: (title: string, message?: string) => {
    globalToastEmitter?.(parseToastPayload(title, message, "success"));
  },
  error: (title: string, message?: string) => {
    globalToastEmitter?.(parseToastPayload(title, message, "error"));
  },
  warning: (title: string, message?: string) => {
    globalToastEmitter?.(parseToastPayload(title, message, "warning"));
  },
  info: (title: string, message?: string) => {
    globalToastEmitter?.(parseToastPayload(title, message, "info"));
  },
};

function parseToastPayload(
  titleOrMessage: string, 
  optionalMessage?: string, 
  defaultType: ToastType = "info"
): Omit<ToastItem, "id"> {
  let title = titleOrMessage.trim();
  let message = optionalMessage?.trim();
  let type = defaultType;

  // Detect emojis or prefixes if single string
  if (!message && title.includes("\n")) {
    const lines = title.split("\n").map(l => l.trim()).filter(Boolean);
    title = lines[0];
    message = lines.slice(1).join("\n");
  }

  // Auto-detect type from common prefixes if not explicitly provided
  if (title.startsWith("❌") || title.startsWith("⛔") || title.toLowerCase().includes("erreur")) {
    type = "error";
  } else if (title.startsWith("✅") || title.startsWith("🎉") || title.toLowerCase().includes("succès")) {
    type = "success";
  } else if (title.startsWith("⚠️") || title.startsWith("Attention")) {
    type = "warning";
  } else if (title.startsWith("ℹ️") || title.startsWith("ℹ")) {
    type = "info";
  }

  // Clean leading emojis from title for cleaner typography
  const cleanTitle = title.replace(/^[❌⛔✅🎉⚠️ℹ️ℹ️\s]+/, "").trim() || title;

  return {
    type,
    title: cleanTitle,
    message,
    duration: type === "error" ? 6000 : 4500,
  };
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((payload: Omit<ToastItem, "id">) => {
    const id = Math.random().toString(36).substring(2, 9) + Date.now();
    const newToast: ToastItem = { ...payload, id };
    setToasts((prev) => [newToast, ...prev].slice(0, 5)); // Keep max 5 active toasts
  }, []);

  useEffect(() => {
    globalToastEmitter = addToast;
    return () => {
      globalToastEmitter = null;
    };
  }, [addToast]);

  const showToast = useCallback(
    (item: Omit<ToastItem, "id"> | string, type: ToastType = "info") => {
      if (typeof item === "string") {
        addToast(parseToastPayload(item, undefined, type));
      } else {
        addToast(item);
      }
    },
    [addToast]
  );

  const success = useCallback((t: string, m?: string) => addToast(parseToastPayload(t, m, "success")), [addToast]);
  const error = useCallback((t: string, m?: string) => addToast(parseToastPayload(t, m, "error")), [addToast]);
  const warning = useCallback((t: string, m?: string) => addToast(parseToastPayload(t, m, "warning")), [addToast]);
  const info = useCallback((t: string, m?: string) => addToast(parseToastPayload(t, m, "info")), [addToast]);

  return (
    <ToastContext.Provider value={{ showToast, success, error, warning, info, removeToast }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    // Return fallback calling global emitter
    return {
      showToast: (t: string | Omit<ToastItem, "id">, type?: ToastType) => {
        if (typeof t === "string") {
          toast[type || "info"](t);
        } else {
          toast[t.type || "info"](t.title, t.message);
        }
      },
      success: toast.success,
      error: toast.error,
      warning: toast.warning,
      info: toast.info,
      removeToast: () => {},
    };
  }
  return context;
}

function ToastContainer({
  toasts,
  onDismiss,
}: {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}) {
  if (toasts.length === 0) return null;

  return (
    <div 
      className="fixed top-5 right-5 z-99999 flex flex-col gap-3 max-w-md w-[calc(100vw-2.5rem)] pointer-events-none transition-all duration-300"
      aria-live="polite"
    >
      {toasts.map((item) => (
        <ToastCard key={item.id} item={item} onDismiss={() => onDismiss(item.id)} />
      ))}
    </div>
  );
}

function ToastCard({
  item,
  onDismiss,
}: {
  item: ToastItem;
  onDismiss: () => void;
}) {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const duration = item.duration || 5000;
    const timer = setTimeout(() => {
      setIsExiting(true);
      setTimeout(onDismiss, 250);
    }, duration);

    return () => clearTimeout(timer);
  }, [item.duration, onDismiss]);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(onDismiss, 200);
  };

  const getStyle = () => {
    switch (item.type) {
      case "success":
        return {
          bg: "bg-white dark:bg-slate-900 border-emerald-500/30 text-slate-900 dark:text-white shadow-emerald-500/10",
          iconBg: "bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400",
          progressBg: "bg-emerald-500",
          icon: <CheckCircle2 className="w-5 h-5 shrink-0" />,
          badge: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
        };
      case "error":
        return {
          bg: "bg-white dark:bg-slate-900 border-rose-500/30 text-slate-900 dark:text-white shadow-rose-500/10",
          iconBg: "bg-rose-100 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400",
          progressBg: "bg-rose-500",
          icon: <XCircle className="w-5 h-5 shrink-0" />,
          badge: "bg-rose-50 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300 border-rose-200 dark:border-rose-800"
        };
      case "warning":
        return {
          bg: "bg-white dark:bg-slate-900 border-amber-500/30 text-slate-900 dark:text-white shadow-amber-500/10",
          iconBg: "bg-amber-100 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400",
          progressBg: "bg-amber-500",
          icon: <AlertTriangle className="w-5 h-5 shrink-0" />,
          badge: "bg-amber-50 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200 dark:border-amber-800"
        };
      case "info":
      default:
        return {
          bg: "bg-white dark:bg-slate-900 border-blue-500/30 text-slate-900 dark:text-white shadow-blue-500/10",
          iconBg: "bg-blue-100 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400",
          progressBg: "bg-blue-500",
          icon: <Info className="w-5 h-5 shrink-0" />,
          badge: "bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border-blue-200 dark:border-blue-800"
        };
    }
  };

  const style = getStyle();

  return (
    <div
      role="alert"
      className={`pointer-events-auto relative overflow-hidden rounded-2xl border p-4 shadow-xl backdrop-blur-md transition-all duration-300 transform ${
        isExiting
          ? "opacity-0 -translate-y-2.5 scale-95"
          : "opacity-100 translate-y-0 scale-100 animate-in fade-in slide-in-from-top-4"
      } ${style.bg}`}
    >
      <div className="flex items-start gap-3.5">
        {/* Type Icon Badge */}
        <div className={`p-2 rounded-xl shrink-0 ${style.iconBg}`}>
          {style.icon}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 pr-2">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-bold leading-tight truncate">
              {item.title}
            </h4>
          </div>

          {item.message && (
            <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line font-medium">
              {item.message}
            </p>
          )}
        </div>

        {/* Close button */}
        <button
          onClick={handleClose}
          className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
          aria-label="Fermer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Progress timer bar */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-100 dark:bg-slate-800/50 overflow-hidden">
        <div
          className={`h-full ${style.progressBg} opacity-75 origin-left animate-[toast-progress_linear_forwards]`}
          style={{ animationDuration: `${item.duration || 5000}ms` }}
        />
      </div>
    </div>
  );
}
