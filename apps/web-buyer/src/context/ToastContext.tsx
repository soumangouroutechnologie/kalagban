"use client";

import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X, HelpCircle } from "lucide-react";

export type ToastType = "success" | "error" | "warning" | "info";

export interface ToastItem {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
}

export interface ConfirmOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: "danger" | "warning" | "info" | "primary";
}

interface ToastContextType {
  toast: {
    success: (message: string, title?: string) => void;
    error: (message: string, title?: string) => void;
    warning: (message: string, title?: string) => void;
    info: (message: string, title?: string) => void;
  };
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    options: ConfirmOptions;
    resolve: (value: boolean) => void;
  } | null>(null);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (type: ToastType, message: string, title?: string, duration: number = 4000) => {
      const id = Math.random().toString(36).substring(2, 9);
      const newToast: ToastItem = { id, type, title, message, duration };
      setToasts((prev) => [...prev, newToast]);

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }
    },
    [removeToast]
  );

  const toast = {
    success: (message: string, title?: string) => addToast("success", message, title),
    error: (message: string, title?: string) => addToast("error", message, title, 5000),
    warning: (message: string, title?: string) => addToast("warning", message, title),
    info: (message: string, title?: string) => addToast("info", message, title),
  };

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setConfirmState({
        isOpen: true,
        options,
        resolve: (val: boolean) => {
          setConfirmState(null);
          resolve(val);
        },
      });
    });
  }, []);

  return (
    <ToastContext.Provider value={{ toast, confirm }}>
      {children}

      {/* TOAST NOTIFICATION CONTAINER */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-4 sm:px-0">
        {toasts.map((t) => {
          let bgClass = "bg-white border-gray-100 text-gray-900";
          let icon = <Info className="text-indigo-600 shrink-0" size={18} />;

          if (t.type === "success") {
            bgClass = "bg-emerald-50/95 border-emerald-200 text-emerald-950 shadow-emerald-500/10";
            icon = <CheckCircle2 className="text-emerald-600 shrink-0" size={18} />;
          } else if (t.type === "error") {
            bgClass = "bg-red-50/95 border-red-200 text-red-950 shadow-red-500/10";
            icon = <AlertCircle className="text-red-600 shrink-0" size={18} />;
          } else if (t.type === "warning") {
            bgClass = "bg-amber-50/95 border-amber-200 text-amber-950 shadow-amber-500/10";
            icon = <AlertTriangle className="text-amber-600 shrink-0" size={18} />;
          } else {
            bgClass = "bg-indigo-50/95 border-indigo-200 text-indigo-950 shadow-indigo-500/10";
            icon = <Info className="text-indigo-600 shrink-0" size={18} />;
          }

          return (
            <div
              key={t.id}
              className={`pointer-events-auto flex items-start gap-3 p-4 rounded-2xl border shadow-xl backdrop-blur-md transition-all animate-in fade-in slide-in-from-top-4 duration-200 ${bgClass}`}
            >
              <div className="mt-0.5">{icon}</div>
              <div className="flex-1 min-w-0">
                {t.title && <h5 className="font-extrabold text-xs tracking-tight mb-0.5">{t.title}</h5>}
                <p className="text-xs font-medium leading-relaxed">{t.message}</p>
              </div>
              <button
                onClick={() => removeToast(t.id)}
                className="opacity-60 hover:opacity-100 transition-opacity p-0.5 rounded-lg text-current cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>

      {/* CONFIRMATION DIALOG MODAL */}
      {confirmState && confirmState.isOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-gray-100 space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-start gap-4">
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                  confirmState.options.type === "danger"
                    ? "bg-red-50 text-red-600"
                    : confirmState.options.type === "warning"
                    ? "bg-amber-50 text-amber-600"
                    : "bg-indigo-50 text-indigo-600"
                }`}
              >
                {confirmState.options.type === "danger" ? (
                  <AlertCircle size={24} />
                ) : confirmState.options.type === "warning" ? (
                  <AlertTriangle size={24} />
                ) : (
                  <HelpCircle size={24} />
                )}
              </div>
              <div>
                <h4 className="font-black text-gray-900 text-base tracking-tight">
                  {confirmState.options.title || "Confirmation requise"}
                </h4>
                <p className="text-xs text-gray-500 font-medium leading-relaxed mt-1">
                  {confirmState.options.message}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => confirmState.resolve(false)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 transition-colors cursor-pointer"
              >
                {confirmState.options.cancelText || "Annuler"}
              </button>

              <button
                onClick={() => confirmState.resolve(true)}
                className={`px-5 py-2.5 rounded-xl text-xs font-black text-white shadow-lg transition-all cursor-pointer ${
                  confirmState.options.type === "danger"
                    ? "bg-red-600 hover:bg-red-700 shadow-red-600/30"
                    : confirmState.options.type === "warning"
                    ? "bg-amber-600 hover:bg-amber-700 shadow-amber-600/30"
                    : "bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/30"
                }`}
              >
                {confirmState.options.confirmText || "Confirmer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
