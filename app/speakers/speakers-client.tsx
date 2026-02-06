"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../../lib/supabaseClient";
import { DEFAULT_CITY_KEY, getCity, withCity } from "../../lib/cities";
import CitySelect from "../city-select";
import MobileNav from "../mobile-nav";

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
  const router = useRouter();
  const searchParams = useSearchParams();
  const cityKey = searchParams.get("city") || DEFAULT_CITY_KEY;
  const city = getCity(cityKey);

  const [session, setSession] = useState<Session | null>(null);
  const userEmail = session?.user?.email ?? null;

  const [lang, setLang] = useState<string>(() => {
    try {
      return window.localStorage.getItem("clawcon.lang") || "en";
    } catch {
      return "en";
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem("clawcon.lang", lang);
    } catch {}
    try {
      document.documentElement.lang = lang;
    } catch {}
  }, [lang]);

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

    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, newSession) => setSession(newSession),
    );

    return () => authListener.subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

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
    <>
      <div className="hn-header">
        <div className="hn-header-left">
          <Link href={withCity("/", city.key)} className="hn-logo">
            <span className="hn-logo-icon">🦞</span>
            <span className="hn-logo-text">Claw Con</span>
          </Link>

          <CitySelect path="/speakers" activeCityKey={city.key} />
          <MobileNav cityKey={city.key} activePath="/speakers" />

          <nav className="hn-nav">
            <a href={withCity("/", city.key)} className="hn-nav-link">
              demos
            </a>
            <span className="hn-nav-sep">|</span>
            <a href={withCity("/", city.key)} className="hn-nav-link">
              topics
            </a>
            <span className="hn-nav-sep">|</span>
            <a href={withCity("/events", city.key)} className="hn-nav-link">
              events
            </a>
            <span className="hn-nav-sep">|</span>
            <a
              href={withCity("/speakers", city.key)}
              className="hn-nav-link active"
            >
              speakers
            </a>
            <span className="hn-nav-sep">|</span>
            <a href={withCity("/robots", city.key)} className="hn-nav-link">
              robots
            </a>
            <span className="hn-nav-sep">|</span>
            <a href={withCity("/papers", city.key)} className="hn-nav-link">
              papers
            </a>
            <span className="hn-nav-sep">|</span>
            <a href={withCity("/sponsors", city.key)} className="hn-nav-link">
              sponsors
            </a>
            <span className="hn-nav-sep">|</span>
            <a href={withCity("/awards", city.key)} className="hn-nav-link">
              awards
            </a>
            <span className="hn-nav-sep">|</span>
            <a href={withCity("/jobs", city.key)} className="hn-nav-link">
              jobs
            </a>
            <span className="hn-nav-sep">|</span>
            <a href={withCity("/photos", city.key)} className="hn-nav-link">
              photos
            </a>
            <span className="hn-nav-sep">|</span>
            <a href={withCity("/livestream", city.key)} className="hn-nav-link">
              livestream
            </a>
            <span className="hn-nav-sep">|</span>
            <a href="/skills" className="hn-nav-link">
              skills
            </a>
            <span className="hn-nav-sep">|</span>
            <a href={withCity("/memes", city.key)} className="hn-nav-link">
              memes
            </a>
            <span className="hn-nav-sep">|</span>
            <a href={withCity("/chats", city.key)} className="hn-nav-link">
              join the chat
            </a>
          </nav>

          <div className="hn-header-right">
            <label
              style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
            >
              {/* language */}
              <select
                value={lang}
                onChange={(e) => setLang(e.target.value)}
                style={{ padding: "2px 6px" }}
                aria-label="Select language"
              >
                <option value="en">English</option>
                <option value="es">Español</option>
                <option value="fr">Français</option>
                <option value="de">Deutsch</option>
                <option value="ja">日本語</option>
              </select>
            </label>

            {userEmail && (
              <div className="hn-user">
                <button
                  className="hn-profile-button"
                  onClick={handleSignOut}
                  title={`Sign out (${userEmail})`}
                  aria-label="Sign out"
                >
                  <span className="hn-profile" aria-hidden="true">
                    {userEmail.trim().charAt(0).toUpperCase()}
                  </span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {notice && <div className="hn-notice">{notice}</div>}

      {/* city selector moved to header */}

      <div className="hn-layout">
        <main className="hn-main">
          <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
            <h2 style={{ margin: 0 }}>Speakers · {city.label}</h2>
            <span style={{ color: "#6b7280", fontSize: 12 }}>
              Profiles pulled from submitted demos/topics.
            </span>
          </div>

          {loading ? (
            <p style={{ color: "#6b7280" }}>Loading…</p>
          ) : speakers.length === 0 ? (
            <p style={{ color: "#6b7280" }}>
              No speakers yet for {city.label}. (Once demos are submitted,
              presenters will appear here.)
            </p>
          ) : view === "list" ? (
            <table className="hn-table" style={{ marginTop: 12 }}>
              <tbody>
                {speakers.map((sp, idx) => (
                  <tr key={sp.name} className="hn-row">
                    <td className="hn-rank">{idx + 1}.</td>
                    <td className="hn-content">
                      <div className="hn-title-row">
                        <span className="hn-title">{sp.name}</span>
                      </div>
                      <div className="hn-meta">
                        <span>
                          {sp.submissionCount} submission
                          {sp.submissionCount === 1 ? "" : "s"}
                        </span>
                        {sp.links.length ? (
                          <>
                            {" "}
                            <span>·</span>{" "}
                            {sp.links.map((l) => (
                              <a
                                key={l}
                                href={l}
                                target="_blank"
                                rel="noreferrer"
                                style={{ marginRight: 8 }}
                              >
                                {l.replace(/^https?:\/\//, "")}
                              </a>
                            ))}
                          </>
                        ) : null}
                      </div>
                      <div className="hn-meta" style={{ marginTop: 4 }}>
                        {sp.submissions.map((s) => (
                          <div key={s.id}>
                            <Link href={`/post/${s.id}`} className="hn-link">
                              {s.title}
                            </Link>
                          </div>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
                gap: 12,
                marginTop: 12,
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
                    <div
                      style={{ marginTop: 10, fontSize: 12, lineHeight: 1.5 }}
                    >
                      {sp.links.map((l) => (
                        <div key={l}>
                          <a href={l} target="_blank" rel="noreferrer">
                            {l.replace(/^https?:\/\//, "")}
                          </a>
                        </div>
                      ))}
                    </div>
                  ) : null}

                  <div
                    style={{ marginTop: 10, color: "#6b7280", fontSize: 12 }}
                  >
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
        </main>

        <aside className="hn-sidebar">
          <div className="hn-sidebar-box">
            <h3>Browse speakers</h3>
            <div className="hn-form">
              <label>
                View
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    className="hn-button"
                    type="button"
                    onClick={() => setView("grid")}
                    disabled={view === "grid"}
                  >
                    Grid
                  </button>
                  <button
                    className="hn-button"
                    type="button"
                    onClick={() => setView("list")}
                    disabled={view === "list"}
                  >
                    List
                  </button>
                </div>
              </label>
              <label>
                Search
                <input
                  className="input"
                  placeholder="Search speakers…"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                />
              </label>
            </div>
          </div>

          <div className="hn-sidebar-box">
            <h4>🎤 Speaker ideas</h4>
            <ul className="hn-ideas">
              <li>
                Want to appear here?{" "}
                <Link href={withCity("/", city.key)}>submit a demo</Link>.
              </li>
              <li>Add your GitHub or site in the submission links.</li>
              <li>
                Include a short bio in the description (we’ll promote later).
              </li>
            </ul>
            <p className="hn-tip">We build profiles from what you submit.</p>
          </div>
        </aside>
      </div>
    </>
  );
}
