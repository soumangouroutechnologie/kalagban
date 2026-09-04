import { supabase } from "./supabase";

export type LogLevel = "critical" | "error" | "warning" | "info";
export type AppSource = "mobile-buyer" | "mobile-seller" | "web-buyer" | "web-relay" | "web-admin" | "api" | "edge-function";

export interface LogContext {
  userId?: string | null;
  route?: string;
  action?: string;
  [key: string]: unknown;
}

/**
 * Journalise une erreur ou un événement système vers Supabase (table system_logs)
 */
export async function logSystemError(
  message: string,
  options: {
    level?: LogLevel;
    app?: AppSource;
    error?: Error | unknown;
    context?: LogContext;
  } = {}
) {
  const { level = "error", app = "web-admin", error, context = {} } = options;

  try {
    let stackTrace: string | null = null;
    if (error instanceof Error) {
      stackTrace = error.stack || error.message;
    } else if (typeof error === "string") {
      stackTrace = error;
    } else if (error && typeof error === "object" && "message" in error) {
      stackTrace = String((error as { message: unknown }).message);
    } else if (error) {
      stackTrace = String(error);
    }

    const enrichedContext = {
      ...context,
      url: typeof window !== "undefined" ? window.location.href : undefined,
      userAgent: typeof window !== "undefined" ? navigator.userAgent : undefined,
      timestamp: new Date().toISOString(),
    };

    await supabase.from("system_logs").insert({
      level,
      app,
      message: String(message).slice(0, 1000),
      stack_trace: stackTrace ? String(stackTrace).slice(0, 5000) : null,
      context: enrichedContext,
      status: "open",
    });
  } catch (err) {
    console.warn("Échec de transmission du log système:", err);
  }
}
