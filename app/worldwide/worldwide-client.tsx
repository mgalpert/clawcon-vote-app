"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { Session } from "@supabase/supabase-js";
import CitySelect from "../city-select";
import MobileNav from "../mobile-nav";
import { supabase } from "../../lib/supabaseClient";
import type { Submission } from "../../lib/types";
import { CITIES, DEFAULT_CITY_KEY, getCity, withCity } from "../../lib/cities";
import { getDomain, timeAgo } from "../../lib/utils";

type SubmissionWithCity = Submission & { cityLabel: string; eventSlug: string };

type Tab = "speaker_demo" | "topic";

type ViewMode = "list" | "grid";

export default function WorldwideClient() {
  const searchParams = useSearchParams();

  // Keep city param for the selector (used for other pages), but Worldwide ignores it.
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

  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<SubmissionWithCity[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>("speaker_demo");
  const [view, setView] = useState<ViewMode>("list");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, newSession) => setSession(newSession),
    );
    return () => authListener.subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const fetchWorldwide = useCallback(async () => {
    setLoading(true);
    setNotice(null);

    const results = await Promise.all(
      CITIES.map(async (c) => {
        const res = await supabase.rpc("get_submissions_with_votes", {
          _event_slug: c.eventSlug,
        });

        if (res.error) {
          return {
            cityLabel: c.label,
            eventSlug: c.eventSlug,
            rows: [] as Submission[],
          };
        }

        return {
          cityLabel: c.label,
          eventSlug: c.eventSlug,
          rows: (res.data as Submission[]) || [],
        };
      }),
    );

    const combined: SubmissionWithCity[] = results.flatMap((r) =>
      r.rows.map((s) => ({
        ...s,
        cityLabel: r.cityLabel,
        eventSlug: r.eventSlug,
      })),
    );

    combined.sort((a, b) => {
      if (b.vote_count !== a.vote_count) return b.vote_count - a.vote_count;
      const aT = a.created_at ? new Date(a.created_at).getTime() : 0;
      const bT = b.created_at ? new Date(b.created_at).getTime() : 0;
      return bT - aT;
    });

    setItems(combined);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchWorldwide();
  }, [fetchWorldwide]);

  const filtered = useMemo(() => {
    return items.filter((i) => i.submission_type === activeTab);
  }, [items, activeTab]);

  return (
    <>
      <div className="hn-header">
        <div className="hn-header-left">
          <Link href={withCity("/", city.key)} className="hn-logo">
            <span className="hn-logo-icon">🦞</span>
            <span className="hn-logo-text">Claw Con</span>
          </Link>

          <CitySelect path="/worldwide" activeCityKey={city.key} />

          <MobileNav cityKey={city.key} activePath="/worldwide" />

          <nav className="hn-nav">
            <a href={withCity("/", city.key)} className="hn-nav-link">
              projects
            </a>
            <span className="hn-nav-sep">|</span>
            <a href={withCity("/", city.key)} className="hn-nav-link">
              topics
            </a>
            <span className="hn-nav-sep">|</span>
            <a href="/worldwide" className="hn-nav-link active">
              worldwide
            </a>
            <span className="hn-nav-sep">|</span>
            <a href={withCity("/events", city.key)} className="hn-nav-link">
              events
            </a>
            <span className="hn-nav-sep">|</span>
            <a href={withCity("/speakers", city.key)} className="hn-nav-link">
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

      <div className="hn-layout">
        <main className="hn-main">
          <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
            <h2 style={{ margin: 0 }}>Worldwide</h2>
            <span style={{ color: "#6b7280", fontSize: 12 }}>
              All cities, combined.
            </span>
          </div>

          <div style={{ margin: "10px 0 12px", display: "flex", gap: 8 }}>
            <button
              className={`hn-button ${activeTab === "speaker_demo" ? "" : "ghost"}`}
              type="button"
              onClick={() => setActiveTab("speaker_demo")}
            >
              projects
            </button>
            <button
              className={`hn-button ${activeTab === "topic" ? "" : "ghost"}`}
              type="button"
              onClick={() => setActiveTab("topic")}
            >
              topics
            </button>

            <span style={{ flex: 1 }} />

            <button
              className="hn-button"
              onClick={() => setView("list")}
              disabled={view === "list"}
              type="button"
            >
              List
            </button>
            <button
              className="hn-button"
              onClick={() => setView("grid")}
              disabled={view === "grid"}
              type="button"
            >
              Grid
            </button>
          </div>

          {loading ? (
            <p style={{ color: "#6b7280" }}>Loading…</p>
          ) : filtered.length === 0 ? (
            <p style={{ color: "#6b7280" }}>No submissions yet.</p>
          ) : view === "list" ? (
            <table className="hn-table">
              <tbody>
                {filtered.map((s, idx) => (
                  <tr key={`${s.cityLabel}-${s.id}`} className="hn-row">
                    <td className="hn-rank">{idx + 1}.</td>
                    <td className="hn-content">
                      <div className="hn-title-row">
                        <a className="hn-title" href={`/post/${s.id}`}>
                          {s.title}
                        </a>
                        <span className="hn-domain">({s.cityLabel})</span>
                      </div>
                      <div className="hn-meta">
                        <span>
                          {s.presenter_name} · {s.vote_count} vote
                          {s.vote_count === 1 ? "" : "s"}
                        </span>
                        {s.links?.length ? (
                          <>
                            {" "}
                            <span>·</span>{" "}
                            <span>{getDomain(s.links[0] || "")}</span>
                          </>
                        ) : null}
                        {s.created_at ? (
                          <>
                            {" "}
                            <span>·</span> <span>{timeAgo(s.created_at)}</span>
                          </>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="hn-grid" style={{ marginTop: 12 }}>
              {filtered.map((s) => (
                <a
                  key={`${s.cityLabel}-${s.id}`}
                  className="hn-card"
                  href={`/post/${s.id}`}
                >
                  <div className="hn-card-title">{s.title}</div>
                  <div className="hn-card-meta">
                    <span>{s.cityLabel}</span>
                    <span>·</span>
                    <span>
                      {s.vote_count} vote{s.vote_count === 1 ? "" : "s"}
                    </span>
                    {s.created_at ? (
                      <>
                        <span>·</span>
                        <span>{timeAgo(s.created_at)}</span>
                      </>
                    ) : null}
                  </div>
                  <div className="hn-card-desc">{s.description}</div>
                </a>
              ))}
            </div>
          )}
        </main>

        <aside className="hn-sidebar">
          <div className="hn-sidebar-box">
            <h4>🌍 Worldwide</h4>
            <p className="hn-tip" style={{ margin: 0 }}>
              This page merges submissions from every city.
            </p>
            <button
              className="hn-button"
              type="button"
              onClick={() => fetchWorldwide()}
              style={{ marginTop: 10 }}
            >
              Refresh
            </button>
          </div>
        </aside>
      </div>
    </>
  );
}
