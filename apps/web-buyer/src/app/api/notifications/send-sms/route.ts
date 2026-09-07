import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, rateLimitResponse } from "@/lib/ratelimit";

export async function POST(req: NextRequest) {
  // Rate limit : max 5 SMS par minute par IP pour éviter le spam et les coûts abusifs
  const rateLimit = await checkRateLimit(req, {
    limit: 5,
    windowSeconds: 60,
    prefix: "send_sms",
  });

  if (!rateLimit.success) {
    return rateLimitResponse(rateLimit, "Trop d'envois de SMS demandés. Veuillez patienter une minute.");
  }

  try {
    const body = await req.json();
    const { phone, message, channel = "whatsapp" } = body;

    if (!phone || !message) {
      return NextResponse.json(
        { success: false, error: "phone and message are required." },
        { status: 400 }
      );
    }

    const zavuApiKey = process.env.ZAVU_API_KEY;
    if (!zavuApiKey) {
      console.warn("⚠️ ZAVU_API_KEY is not configured in environment variables.");
      return NextResponse.json({
        success: true,
        delivered: false,
        message: "ZAVU_API_KEY missing. Notification logged in test mode.",
      });
    }

    const formattedPhone = phone.startsWith("+") ? phone : `+${phone.replace(/\D/g, "")}`;

    const res = await fetch("https://api.zavu.dev/v1/messages", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${zavuApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to: formattedPhone,
        text: message,
        channel: channel === "sms" ? "sms" : "whatsapp",
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error("Zavu API error:", data);
      return NextResponse.json(
        { success: false, error: data?.message || "Failed to send SMS/WhatsApp via Zavu" },
        { status: res.status }
      );
    }

    return NextResponse.json({
      success: true,
      delivered: true,
      data,
    });
  } catch (err: unknown) {
    console.error("Error in /api/notifications/send-sms:", err);
    const errorMessage = err instanceof Error ? err.message : "Erreur interne lors de l'envoi du SMS/WhatsApp";
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
