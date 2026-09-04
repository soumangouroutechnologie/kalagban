import { supabase } from "./supabase";
import { Platform } from "react-native";
import Constants from "expo-constants";

export type LogLevel = "critical" | "error" | "warning" | "info";

export interface LogContext {
  screen?: string;
  userId?: string | null;
  shopId?: string | null;
  action?: string;
  [key: string]: any;
}

/**
 * Journalise une erreur ou un événement système vers Supabase (table system_logs) pour le vendeur
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
      platform: Platform.OS,
      os_version: Platform.Version,
      app_version: Constants?.expoConfig?.version || "1.0.0",
      timestamp: new Date().toISOString(),
    };

    await supabase.from("system_logs").insert({
      level,
      app: "mobile-seller",
      message: String(message).slice(0, 1000),
      stack_trace: stackTrace ? String(stackTrace).slice(0, 5000) : null,
      context: enrichedContext,
      status: "open",
    });
  } catch (err) {
    console.warn("Échec de transmission du log vendeur:", err);
  }
}
