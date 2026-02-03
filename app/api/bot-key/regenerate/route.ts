import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";
import { encryptBotKey, getKeyVersion, hashBotKey } from "../../../../lib/botKeyCrypto";

function generateBotKey(): string {
  return crypto.randomBytes(32).toString("hex");
}

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";

  if (!token) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(token);
  const user = authData?.user;

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { data: existing, error: existingError } = await supabaseAdmin
    .from("bot_keys")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (existingError) {
    return NextResponse.json({ error: existingError.message }, { status: 500 });
  }

  const botKeyId = existing?.id ?? crypto.randomUUID();
  const apiKey = generateBotKey();
  const encrypted = encryptBotKey(apiKey, user.id, botKeyId);
  const last4 = apiKey.slice(-4);
  const keyVersion = getKeyVersion();

  const { error } = await supabaseAdmin.from("bot_keys").upsert(
    {
      id: botKeyId,
      user_id: user.id,
      ciphertext: encrypted.ciphertext,
      iv: encrypted.iv,
      tag: encrypted.tag,
      key_hash: hashBotKey(apiKey),
      last4,
      key_version: keyVersion
    },
    { onConflict: "user_id" }
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await supabaseAdmin.from("bot_key_audit").insert({
    user_id: user.id,
    bot_key_id: botKeyId,
    action: "regenerate"
  });

  return NextResponse.json({
    api_key: apiKey,
    last4,
    warning: "Save this key securely. It will NOT be shown again."
  });
}
