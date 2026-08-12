import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { image, imageUrl } = body;

    if (!image && !imageUrl) {
      return NextResponse.json({ error: "Image data or URL is required" }, { status: 400 });
    }

    return NextResponse.json({
      status: "success",
      message: "Background removal ready",
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to process image";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
