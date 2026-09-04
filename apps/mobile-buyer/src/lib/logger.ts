import { supabase } from "./supabase";
import { Platform } from "react-native";
import Constants from "expo-constants";

export type LogLevel = "critical" | "error" | "warning" | "info";

export interface LogContext {
  screen?: string;
  userId?: string | null;
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
    error?: Error | any;
    context?: LogContext;
  } = {}
) {
  const { level = "error", error, context = {} } = options;

  try {
    const stackTrace = error instanceof Error ? error.stack : (error?.message || null);
    
    const enrichedContext = {
      ...context,
      platform: Platform.OS,
      os_version: Platform.Version,
      app_version: Constants?.expoConfig?.version || "1.0.0",
      timestamp: new Date().toISOString(),
    };

    await supabase.from("system_logs").insert({
      level,
      app: "mobile-buyer",
      message: String(message).slice(0, 1000),
      stack_trace: stackTrace ? String(stackTrace).slice(0, 5000) : null,
      context: enrichedContext,
      status: "open",
    });
  } catch (err) {
    // Évite toute interruption de l'application si l'envoi de log échoue
    console.warn("Échec de transmission du log système:", err);
  }
}
