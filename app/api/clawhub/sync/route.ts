import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../../lib/supabaseAdmin";

export const runtime = "nodejs";

type ClawhubSkillItem = {
  slug: string;
  displayName: string;
  summary: string | null;
  tags?: Record<string, string> | null;
  stats?: {
    comments?: number;
    downloads?: number;
    installsAllTime?: number;
    installsCurrent?: number;
    stars?: number;
    versions?: number;
  } | null;
  createdAt?: number;
  updatedAt?: number;
  latestVersion?: {
    version?: string;
    createdAt?: number;
    changelog?: string;
  } | null;
};

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CLAWHUB_SYNC_SECRET || "";
  if (!secret) return false;
  const auth = req.headers.get("authorization") || "";
  if (auth === `Bearer ${secret}`) return true;
  const q = req.nextUrl.searchParams.get("secret") || "";
  return q === secret;
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = "https://clawhub.ai/api/v1/skills";

  const res = await fetch(url, {
    headers: {
      "User-Agent": "clawcon-vote-app (sync)",
      Accept: "application/json",
    },
    // Revalidate is irrelevant here; this is a route handler.
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    return NextResponse.json(
      { error: `Failed to fetch ClawHub skills (${res.status})`, body: text },
      { status: 502 },
    );
  }

  const json = (await res.json()) as { items: ClawhubSkillItem[] };
  const items = Array.isArray(json.items) ? json.items : [];

  const rows = items.map((s) => ({
    slug: s.slug,
    display_name: s.displayName,
    summary: s.summary ?? null,
    tags: (s.tags ?? null) as Record<string, string> | null,
    latest_version: s.latestVersion?.version ?? s.tags?.latest ?? null,
    installs_all_time: s.stats?.installsAllTime ?? null,
    installs_current: s.stats?.installsCurrent ?? null,
    stars: s.stats?.stars ?? null,
    versions: s.stats?.versions ?? null,
    created_at_ms: s.createdAt ?? null,
    updated_at_ms: s.updatedAt ?? null,
    raw: s as unknown as object,
    last_synced_at: new Date().toISOString(),
  }));

  const supabase = getSupabaseAdmin();

  const { error } = await supabase
    .from("clawhub_skills")
    .upsert(rows, { onConflict: "slug" });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, count: rows.length });
}
