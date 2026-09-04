import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://ddqwnscrmzwnciinehtf.supabase.co";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false },
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { level = "error", app = "web-admin", message, stack_trace, context = {} } = body;

    if (!message) {
      return NextResponse.json({ error: "Le champ 'message' est requis." }, { status: 400 });
    }

    const validLevels = ["critical", "error", "warning", "info"];
    const validApps = ["mobile-buyer", "mobile-seller", "web-buyer", "web-relay", "web-admin", "api", "edge-function"];

    const normalizedLevel = validLevels.includes(level) ? level : "error";
    const normalizedApp = validApps.includes(app) ? app : "api";

    const { data, error } = await supabaseAdmin
      .from("system_logs")
      .insert({
        level: normalizedLevel,
        app: normalizedApp,
        message: String(message).slice(0, 1000),
        stack_trace: stack_trace ? String(stack_trace).slice(0, 5000) : null,
        context: typeof context === "object" ? context : { data: context },
        status: "open",
      })
      .select()
      .single();

    if (error) {
      console.error("Erreur lors de l'enregistrement du log:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, log: data }, { status: 201 });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Internal Server Error";
    console.error("Erreur inattendue dans /api/logs:", err);
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const level = searchParams.get("level");
    const app = searchParams.get("app");
    const status = searchParams.get("status");

    let query = supabaseAdmin
      .from("system_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (level && level !== "all") query = query.eq("level", level);
    if (app && app !== "all") query = query.eq("app", app);
    if (status && status !== "all") query = query.eq("status", status);

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ logs: data || [] }, { status: 200 });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
