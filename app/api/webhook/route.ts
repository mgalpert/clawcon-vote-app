import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../lib/supabaseAdmin";
import { hashBotKey } from "../../../lib/botKeyCrypto";

// Rate limiting per API key (resets on deploy)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const RATE_LIMIT_MAX = 20; // 20 submissions per hour per API key

function isRateLimited(key: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(key);
  
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }
  
  if (entry.count >= RATE_LIMIT_MAX) {
    return true;
  }
  
  entry.count++;
  return false;
}

function sanitizeLink(link: string): string | null {
  try {
    const url = new URL(link);
    if (url.protocol !== "https:") return null;
    if (url.username || url.password) return null;
    return url.toString();
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    const title = typeof payload.title === "string" ? payload.title.trim() : "";
    const description =
      typeof payload.description === "string" ? payload.description.trim() : "";
    const presenterName =
      typeof payload.presenter_name === "string"
        ? payload.presenter_name.trim()
        : "";
    const rawLinks = Array.isArray(payload.links)
      ? payload.links.filter((link: unknown) => typeof link === "string")
      : [];
    const links = rawLinks
      .map((link: string) => sanitizeLink(link.trim()))
      .filter((link: string | null): link is string => link !== null);

    const submissionType =
      payload.submission_type === "topic" ? "topic" : "speaker_demo";

    const submittedBy =
      payload.submitted_by === "bot_on_behalf"
        ? "bot_on_behalf"
        : payload.submitted_by === "human"
          ? "human"
          : "bot";

    const submittedForName =
      typeof payload.submitted_for_name === "string"
        ? payload.submitted_for_name.trim()
        : "";
    const submittedForContact =
      typeof payload.submitted_for_contact === "string"
        ? payload.submitted_for_contact.trim()
        : "";

    if (!title || !description || !presenterName) {
      return NextResponse.json(
        { error: "Missing required fields." },
        { status: 400 }
      );
    }

    if (submittedBy === "bot_on_behalf" && !submittedForName) {
      return NextResponse.json(
        { error: "Missing submitted_for_name for bot_on_behalf." },
        { status: 400 }
      );
    }

    const apiKey = request.headers.get("x-api-key") || "";
    const apiKeyHash = apiKey ? hashBotKey(apiKey) : "";
    const supabaseAdmin = getSupabaseAdmin();

    const { data: keyRow } = await supabaseAdmin
      .from("bot_keys")
      .select("id")
      .eq("key_hash", apiKeyHash)
      .maybeSingle();

    if (!apiKey || !keyRow?.id) {
      return NextResponse.json({ error: "Invalid bot API key." }, { status: 401 });
    }

    // Rate limit by API key
    if (isRateLimited(apiKey)) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Max 20 submissions per hour." },
        { status: 429 }
      );
    }

    const { error } = await supabaseAdmin.from("submissions").insert({
      title,
      description,
      presenter_name: presenterName,
      links: links.length > 0 ? links : null,
      submission_type: submissionType,
      submitted_by: submittedBy,
      submitted_for_name: submittedForName || null,
      submitted_for_contact: submittedForContact || null
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Invalid JSON payload." },
      { status: 400 }
    );
  }
}
