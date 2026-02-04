import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    message: "Use /api/bot-key/reveal or /api/bot-key/regenerate for authenticated access."
  });
}

export async function POST() {
  return NextResponse.json(
    { error: "Deprecated. Use /api/bot-key/regenerate." },
    { status: 410 }
  );
}
