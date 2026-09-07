"use client";

import { supabase } from "./supabase";

const TELEMETRY_ADMIN_URL =
  process.env.NEXT_PUBLIC_ADMIN_URL ||
  (typeof window !== "undefined" && window.location.hostname.includes("localhost")
    ? "http://localhost:3000"
    : "https://admin.kalagban.com");

const RECENT_ERRORS = new Set<string>();

export function getDeviceId(): string {
  if (typeof window === "undefined") return "server_env";
  try {
    const key = "kalagban_device_id";
    let id = localStorage.getItem(key);
    if (!id) {
      id = "seller_web_" + Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
      localStorage.setItem(key, id);
    }
    return id;
  } catch {
    return "anonymous_seller_web";
  }
}

export function getDeviceInfo(): { os: string; model: string } {
  if (typeof window === "undefined") {
    return { os: "Server", model: "NextJS Server" };
  }

  const ua = navigator.userAgent || "";
  let os = "Autre";
  if (/android/i.test(ua)) os = "Android";
  else if (/iphone|ipad|ipod/i.test(ua)) os = "iOS";
  else if (/windows/i.test(ua)) os = "Windows";
  else if (/macintosh|mac os x/i.test(ua)) os = "macOS";
  else if (/linux/i.test(ua)) os = "Linux";

  let model = "Desktop Browser";
  if (/mobile/i.test(ua)) {
    model = "Mobile Web";
    if (/iphone/i.test(ua)) model = "Apple iPhone (Web)";
    else if (/ipad/i.test(ua)) model = "Apple iPad (Web)";
    else if (/samsung/i.test(ua)) model = "Samsung (Web)";
  } else {
    if (/chrome/i.test(ua) && !/edg/i.test(ua)) model = "Chrome Desktop";
    else if (/safari/i.test(ua) && !/chrome/i.test(ua)) model = "Safari Desktop";
    else if (/firefox/i.test(ua)) model = "Firefox Desktop";
    else if (/edg/i.test(ua)) model = "Edge Desktop";
  }

  return { os, model };
}

export interface TelemetryReportParams {
  app?: "web-buyer" | "web-seller" | "web-admin" | "web-relay" | "mobile-buyer" | "mobile-seller" | "api";
  level?: "fatal" | "error" | "warning" | "info";
  message: string;
  error_stack?: string;
  route_path?: string;
  user_id?: string;
  metadata?: Record<string, unknown>;
}

export async function reportError(params: TelemetryReportParams): Promise<void> {
  if (typeof window === "undefined") return;

  const errorSignature = [params.app || "web-seller", params.message, params.route_path || window.location.pathname].join("::");
  if (RECENT_ERRORS.has(errorSignature)) return;
  RECENT_ERRORS.add(errorSignature);
  setTimeout(() => RECENT_ERRORS.delete(errorSignature), 10000);

  const { os, model } = getDeviceInfo();
  const device_id = getDeviceId();
  const route_path = params.route_path || (typeof window !== "undefined" ? window.location.pathname : undefined);

  const payload = {
    app: params.app || "web-seller",
    level: params.level || "error",
    message: String(params.message).slice(0, 1000),
    error_stack: params.error_stack ? String(params.error_stack).slice(0, 4000) : undefined,
    device_id,
    device_os: os,
    device_model: model,
    app_version: "1.0.0",
    route_path,
    user_id: params.user_id,
    metadata: {
      ...params.metadata,
      url: typeof window !== "undefined" ? window.location.href : "",
      screen: typeof window !== "undefined" ? `${window.innerWidth}x${window.innerHeight}` : "",
      timestamp: new Date().toISOString(),
    },
  };

  try {
    const endpoint = `${TELEMETRY_ADMIN_URL}/api/telemetry/report`;
    await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    });
  } catch (apiErr) {
    console.warn("API Telemetry report failed, attempting direct Supabase fallback...", apiErr);
    try {
      await supabase.from("system_logs").insert({
        service_name: payload.app,
        log_level: payload.level,
        message: payload.message,
        payload: {
          ...payload.metadata,
          error_stack: payload.error_stack,
          device_id: payload.device_id,
          device_os: payload.device_os,
          device_model: payload.device_model,
          route_path: payload.route_path,
        },
      });
    } catch (fallbackErr) {
      console.error("Telemetry fallback logging failed:", fallbackErr);
    }
  }
}

let isInitialized = false;

export function initGlobalTelemetry(appName: TelemetryReportParams["app"] = "web-seller") {
  if (typeof window === "undefined" || isInitialized) return;
  isInitialized = true;

  window.addEventListener("error", (event) => {
    reportError({
      app: appName,
      level: "error",
      message: event.message || "Erreur JavaScript non interceptée",
      error_stack: event.error?.stack || `At ${event.filename}:${event.lineno}:${event.colno}`,
      route_path: window.location.pathname,
    });
  });

  window.addEventListener("unhandledrejection", (event) => {
    const reason = event.reason;
    const message = reason instanceof Error ? reason.message : typeof reason === "string" ? reason : "Promise Rejection non gérée";
    const stack = reason instanceof Error ? reason.stack : undefined;

    reportError({
      app: appName,
      level: "error",
      message: `[UnhandledRejection] ${message}`,
      error_stack: stack,
      route_path: window.location.pathname,
    });
  });
}
