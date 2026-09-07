import { supabase } from "./supabase";

export type LogLevel = "critical" | "error" | "warning" | "info";
export type AppSource =
  | "mobile-buyer"
  | "mobile-seller"
  | "web-buyer"
  | "web-seller"
  | "web-relay"
  | "web-admin"
  | "api"
  | "edge-function";

export interface LogContext {
  userId?: string | null;
  route?: string;
  action?: string;
  [key: string]: unknown;
}

function getOrCreateDeviceId(): string {
  if (typeof window === "undefined") return "server_runtime";
  try {
    let devId = localStorage.getItem("kalagban_device_id");
    if (!devId) {
      devId = `dev_${Math.random().toString(36).substring(2, 10)}_${Date.now().toString(36)}`;
      localStorage.setItem("kalagban_device_id", devId);
    }
    return devId;
  } catch {
    return "unknown_device";
  }
}

function detectOS(): string {
  if (typeof window === "undefined") return "Server";
  const ua = navigator.userAgent;
  if (/android/i.test(ua)) return "Android";
  if (/iphone|ipad|ipod/i.test(ua)) return "iOS";
  if (/windows/i.test(ua)) return "Windows";
  if (/macintosh|mac os x/i.test(ua)) return "macOS";
  if (/linux/i.test(ua)) return "Linux";
  return "Autre";
}

/**
 * Journalise une erreur ou un bug avec télémétrie vers Supabase (table system_logs)
 */
export async function logSystemError(
  message: string,
  options: {
    level?: LogLevel;
    app?: AppSource;
    error?: Error | unknown;
    context?: LogContext;
    route?: string;
  } = {}
) {
  const { level = "error", app = "web-admin", error, context = {}, route } = options;

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

    const deviceId = getOrCreateDeviceId();
    const deviceOS = detectOS();
    const currentRoute = route || (typeof window !== "undefined" ? window.location.pathname : "/");

    // Compute simple client fingerprint
    const normalizedMsg = String(message).trim().replace(/\d+/g, "N").slice(0, 100);
    const fingerprint = `${app}:${level}:${normalizedMsg}`;

    const enrichedContext = {
      ...context,
      url: typeof window !== "undefined" ? window.location.href : undefined,
      userAgent: typeof window !== "undefined" ? navigator.userAgent : undefined,
      screenResolution: typeof window !== "undefined" ? `${window.innerWidth}x${window.innerHeight}` : undefined,
      timestamp: new Date().toISOString(),
    };

    await supabase.from("system_logs").insert({
      level,
      app,
      message: String(message).slice(0, 1000),
      stack_trace: stackTrace ? String(stackTrace).slice(0, 8000) : null,
      fingerprint,
      device_id: deviceId,
      device_os: deviceOS,
      device_model: typeof window !== "undefined" ? (/mobile/i.test(navigator.userAgent) ? "Mobile Browser" : "Desktop Browser") : "Server",
      route_or_screen: currentRoute,
      context: enrichedContext,
      status: "open",
    });
  } catch (err) {
    console.warn("Échec de transmission du log télémétrique:", err);
  }
}
