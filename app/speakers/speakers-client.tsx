"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";
import { DEFAULT_CITY_KEY, getCity, withCity } from "../../lib/cities";

type SubmissionRow = {
  id: string;
  event_id?: string | null;
  title: string;
  presenter_name: string;
  links: string[] | null;
  created_at: string;
};

type Speaker = {
  name: string;
  submissionCount: number;
  latestCreatedAt: string;
  links: string[];
  submissions: Array<{ id: string; title: string }>;
};

type ViewMode = "grid" | "list";

function uniq<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}

export default function SpeakersClient() {
  const searchParams = useSearchParams();
  const cityKey = searchParams.get("city") || DEFAULT_CITY_KEY;
  const city = getCity(cityKey);

  const [eventId, setEventId] = useState<string | null>(null);
  const [rows, setRows] = useState<SubmissionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);
  const [view, setView] = useState<ViewMode>("grid");
  const [q, setQ] = useState("");

  const fetchEvent = useCallback(async () => {
    const { data, error } = await supabase
      .from("events")
      .select("id")
      .eq("slug", city.eventSlug)
      .maybeSingle();

    if (error) {
      setEventId(null);
      return;
    }

    setEventId(data?.id ?? null);
  }, [city.eventSlug]);

  const fetchSubmissions = useCallback(async () => {
    setLoading(true);
    setNotice(null);

    // If events are configured, prefer scoping by event_id.
    // If not, fall back to all submissions (best effort).
    const base = supabase
      .from("submissions")
      .select("id,event_id,title,presenter_name,links,created_at")
      .order("created_at", { ascending: false });

    const { data, error } = eventId
      ? await base.eq("event_id", eventId)
      : await base;

    if (error) {
      setRows([]);
      setNotice("Unable to load speakers right now.");
      setLoading(false);
      return;
    }

    setRows((data as SubmissionRow[]) || []);
    setLoading(false);
  }, [eventId]);

  useEffect(() => {
    // load persisted view
    try {
      const stored = window.localStorage.getItem("clawcon.speakers.view");
      if (stored === "list" || stored === "grid") setView(stored);
    } catch {}
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem("clawcon.speakers.view", view);
    } catch {}
  }, [view]);

  useEffect(() => {
    fetchEvent();
  }, [fetchEvent]);

  useEffect(() => {
    fetchSubmissions();
  }, [fetchSubmissions]);

  const speakers = useMemo(() => {
    const by = new Map<string, Speaker>();

    for (const s of rows) {
      const name = (s.presenter_name || "").trim() || "Anonymous";
      const entry = by.get(name) || {
        name,
        submissionCount: 0,
        latestCreatedAt: s.created_at,
        links: [],
        submissions: [],
      };

      entry.submissionCount += 1;
      if (s.created_at > entry.latestCreatedAt)
        entry.latestCreatedAt = s.created_at;

      if (s.links?.length) entry.links.push(...s.links);
      entry.submissions.push({ id: s.id, title: s.title });

      by.set(name, entry);
    }

    const out = Array.from(by.values()).map((sp) => ({
      ...sp,
      links: uniq(sp.links).slice(0, 4),
      submissions: sp.submissions.slice(0, 5),
    }));

    out.sort((a, b) => {
      if (b.submissionCount !== a.submissionCount)
        return b.submissionCount - a.submissionCount;
      return b.latestCreatedAt.localeCompare(a.latestCreatedAt);
    });

    const query = q.trim().toLowerCase();
    if (!query) return out;

    return out.filter((sp) => {
      if (sp.name.toLowerCase().includes(query)) return true;
      return sp.submissions.some((x) => x.title.toLowerCase().includes(query));
    });
  }, [rows, q]);

  return (
    <main style={{ padding: 24, maxWidth: 1200, margin: "0 auto" }}>
      <header style={{ marginBottom: 18 }}>
        <div
          style={{ display: "flex", justifyContent: "space-between", gap: 12 }}
        >
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 6 }}>
              Speakers
            </h1>
            <p style={{ color: "#4b5563", margin: 0 }}>
              {city.label} · Profiles pulled from submitted demos/topics.
            </p>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
            <Link href={withCity("/", city.key)} className="hn-button">
              ← submissions
            </Link>
          </div>
        </div>

        <div
          style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}
        >
          <button
            className="hn-button"
            onClick={() => setView("grid")}
            disabled={view === "grid"}
          >
            Grid
          </button>
          <button
            className="hn-button"
            onClick={() => setView("list")}
            disabled={view === "list"}
          >
            List
          </button>
          <input
            className="input"
            placeholder="Search speakers…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            style={{ minWidth: 220 }}
          />
        </div>

        {notice && <div className="hn-notice">{notice}</div>}
      </header>

      <section>
        {loading ? (
          <p style={{ color: "#6b7280" }}>Loading…</p>
        ) : speakers.length === 0 ? (
          <p style={{ color: "#6b7280" }}>
            No speakers yet for {city.label}. (Once demos are submitted,
            presenters will appear here.)
          </p>
        ) : view === "list" ? (
          <div style={{ border: "1px solid #e5e7eb", borderRadius: 10 }}>
            {speakers.map((sp, idx) => (
              <div
                key={sp.name}
                style={{
                  padding: 12,
                  borderBottom:
                    idx === speakers.length - 1 ? "none" : "1px solid #e5e7eb",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 12,
                  }}
                >
                  <div style={{ fontWeight: 800 }}>{sp.name}</div>
                  <div style={{ color: "#6b7280", fontSize: 12 }}>
                    {sp.submissionCount} submission
                    {sp.submissionCount === 1 ? "" : "s"}
                  </div>
                </div>

                {sp.links.length ? (
                  <div style={{ marginTop: 6, fontSize: 12 }}>
                    {sp.links.map((l) => (
                      <a
                        key={l}
                        href={l}
                        target="_blank"
                        rel="noreferrer"
                        style={{ marginRight: 10 }}
                      >
                        {l.replace(/^https?:\/\//, "")}
                      </a>
                    ))}
                  </div>
                ) : null}

                <div style={{ marginTop: 8, color: "#6b7280", fontSize: 12 }}>
                  {sp.submissions.map((s) => (
                    <div key={s.id}>
                      <Link href={`/post/${s.id}`}>{s.title}</Link>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
              gap: 12,
            }}
          >
            {speakers.map((sp) => (
              <div
                key={sp.name}
                style={{
                  border: "1px solid #e5e7eb",
                  borderRadius: 12,
                  padding: 14,
                  background: "#fff",
                }}
              >
                <div style={{ fontWeight: 900, marginBottom: 6 }}>
                  {sp.name}
                </div>
                <div style={{ color: "#6b7280", fontSize: 12 }}>
                  {sp.submissionCount} submission
                  {sp.submissionCount === 1 ? "" : "s"}
                </div>

                {sp.links.length ? (
                  <div style={{ marginTop: 10, fontSize: 12, lineHeight: 1.5 }}>
                    {sp.links.map((l) => (
                      <div key={l}>
                        <a href={l} target="_blank" rel="noreferrer">
                          {l.replace(/^https?:\/\//, "")}
                        </a>
                      </div>
                    ))}
                  </div>
                ) : null}

                <div style={{ marginTop: 10, color: "#6b7280", fontSize: 12 }}>
                  {sp.submissions.map((s) => (
                    <div key={s.id}>
                      <Link href={`/post/${s.id}`}>{s.title}</Link>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        <div style={{ marginTop: 14, color: "#6b7280", fontSize: 12 }}>
          Tip: this follows <code>?city=</code> and (when available) scopes to
          the city’s configured <code>events.slug</code>.
        </div>
      </section>
    </main>
  );
}
