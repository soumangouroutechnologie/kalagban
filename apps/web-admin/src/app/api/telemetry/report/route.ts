import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://ddqwnscrmzwnciinehtf.supabase.co";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false },
});

// Simple in-memory sliding window rate-limiter (max 60 reports / min / IP)
const rateLimitMap = new Map<string, { count: number; expiresAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || entry.expiresAt < now) {
    rateLimitMap.set(ip, { count: 1, expiresAt: now + 60_000 });
    return true;
  }

  if (entry.count >= 60) {
    return false;
  }

  entry.count++;
  return true;
}

// OPTIONS for CORS pre-flight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Device-ID",
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown-ip";
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: "Too many telemetry reports. Please slow down." },
        { status: 429 }
      );
    }

    const body = await req.json();
    const {
      level = "error",
      app = "web-admin",
      message,
      stack_trace,
      route_or_screen = "/",
      device_id,
      device_os,
      device_model,
      user_id,
      context = {},
    } = body;

    if (!message) {
      return NextResponse.json({ error: "Le champ 'message' est obligatoire." }, { status: 400 });
    }

    const validLevels = ["critical", "error", "warning", "info"];
    const validApps = [
      "mobile-buyer",
      "mobile-seller",
      "web-buyer",
      "web-seller",
      "web-relay",
      "web-admin",
      "api",
      "edge-function",
    ];

    const normalizedLevel = validLevels.includes(level) ? level : "error";
    const normalizedApp = validApps.includes(app) ? app : "api";

    // Detect user-agent fallback if device_os or model not provided
    const userAgent = req.headers.get("user-agent") || "";
    let detectedOS = device_os;
    let detectedModel = device_model;

    if (!detectedOS) {
      if (/android/i.test(userAgent)) detectedOS = "Android";
      else if (/iphone|ipad|ipod/i.test(userAgent)) detectedOS = "iOS";
      else if (/windows/i.test(userAgent)) detectedOS = "Windows";
      else if (/macintosh|mac os x/i.test(userAgent)) detectedOS = "macOS";
      else if (/linux/i.test(userAgent)) detectedOS = "Linux";
      else detectedOS = "Autre";
    }

    if (!detectedModel) {
      if (/mobile/i.test(userAgent)) detectedModel = "Mobile Web";
      else detectedModel = "Desktop Browser";
    }

    const effectiveDeviceId = typeof device_id === "string" && device_id.length > 0
      ? device_id
      : "anon_" + crypto.createHash("sha1").update(ip + userAgent).digest("hex").slice(0, 16);

    // Deterministic Fingerprint: sha256
    const normalizedMsg = String(message).trim().replace(/\d+/g, "N").slice(0, 200);
    const fingerprintPayload = [normalizedApp, normalizedLevel, normalizedMsg].join(":");
    const fingerprint = crypto
      .createHash("sha256")
      .update(fingerprintPayload)
      .digest("hex")
      .slice(0, 32);

    const logEntry = {
      level: normalizedLevel,
      app: normalizedApp,
      message: String(message).slice(0, 1000),
      stack_trace: stack_trace ? String(stack_trace).slice(0, 8000) : null,
      fingerprint,
      device_id: effectiveDeviceId,
      device_os: detectedOS,
      device_model: detectedModel,
      route_or_screen: String(route_or_screen).slice(0, 255),
      context: {
        ...(typeof context === "object" ? context : { raw: context }),
        user_id: user_id || null,
        user_agent: userAgent,
        ip_hash: crypto.createHash("md5").update(ip).digest("hex").slice(0, 8),
      },
      status: "open",
    };

    const { data, error } = await supabaseAdmin
      .from("system_logs")
      .insert(logEntry)
      .select()
      .single();

    if (error) {
      console.error("Telemetry DB insertion error:", error);
      return NextResponse.json({ error: error.message }, {
        status: 500,
        headers: { "Access-Control-Allow-Origin": "*" },
      });
    }

    return NextResponse.json(
      { success: true, log_id: data.id, fingerprint },
      {
        status: 201,
        headers: { "Access-Control-Allow-Origin": "*" },
      }
    );
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Internal Server Error";
    console.error("Erreur inattendue dans /api/telemetry/report:", err);
    return NextResponse.json({ error: errorMsg }, {
      status: 500,
      headers: { "Access-Control-Allow-Origin": "*" },
    });
  }
}
