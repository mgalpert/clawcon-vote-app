import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";
import crypto from "crypto";

export async function GET() {
  return NextResponse.json({
    message: "POST your email to get a bot key",
    usage: 'curl -X POST https://www.claw-con.com/api/bot-key -H "Content-Type: application/json" -d \'{"email": "you@example.com"}\''
  });
}

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    const email =
      typeof payload.email === "string" ? payload.email.trim().toLowerCase() : "";

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Valid email required." }, { status: 400 });
    }

    const { data: existing } = await supabaseAdmin
      .from("bot_keys")
      .select("api_key")
      .eq("email", email)
      .maybeSingle();

    if (existing?.api_key) {
      return NextResponse.json({ api_key: existing.api_key });
    }

    const apiKey = crypto.randomBytes(24).toString("hex");

    const { error } = await supabaseAdmin.from("bot_keys").insert({
      email,
      api_key: apiKey
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ api_key: apiKey });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("bot-key error:", message, err);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
