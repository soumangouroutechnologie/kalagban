import { supabase } from "./supabase";

export type LogLevel = "critical" | "error" | "warning" | "info";
export type AppSource = "mobile-buyer" | "mobile-seller" | "web-buyer" | "web-relay" | "web-admin" | "api" | "edge-function";

export interface LogContext {
  userId?: string | null;
  route?: string;
  action?: string;
  [key: string]: any;
}

/**
 * Journalise une erreur ou un événement système vers Supabase (table system_logs)
 */
export async function logSystemError(
  message: string,
  options: {
    level?: LogLevel;
    app?: AppSource;
    error?: Error | any;
    context?: LogContext;
  } = {}
) {
  const { level = "error", app = "web-admin", error, context = {} } = options;

  try {
    const stackTrace = error instanceof Error ? error.stack : (error?.message || null);

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
