import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../../lib/supabaseAdmin";
import { decryptBotKey } from "../../../../lib/botKeyCrypto";

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const RATE_LIMIT_MAX = 3;

function isRateLimited(userId: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(userId);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    return true;
  }

  entry.count++;
  return false;
}

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";

  if (!token) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const supabaseAdmin = getSupabaseAdmin();

  const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(token);
  const user = authData?.user;

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (isRateLimited(user.id)) {
    return NextResponse.json(
      { error: "Too many reveal attempts. Please try again later." },
      { status: 429 }
    );
  }

  const { data: botKeyRow, error } = await supabaseAdmin
    .from("bot_keys")
    .select("id,ciphertext,iv,tag,last4")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!botKeyRow) {
    return NextResponse.json({ error: "No bot key found." }, { status: 404 });
  }

  const apiKey = decryptBotKey(
    {
      ciphertext: botKeyRow.ciphertext,
      iv: botKeyRow.iv,
      tag: botKeyRow.tag
    },
    user.id,
    botKeyRow.id
  );

  await supabaseAdmin.from("bot_key_audit").insert({
    user_id: user.id,
    bot_key_id: botKeyRow.id,
    action: "reveal"
  });

  return NextResponse.json({ api_key: apiKey, last4: botKeyRow.last4 });
}
