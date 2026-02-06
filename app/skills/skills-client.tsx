"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../../lib/supabaseClient";
import { DEFAULT_CITY_KEY, getCity, withCity } from "../../lib/cities";

type ViewMode = "grid" | "list";

type ClawhubSkill = {
  slug: string;
  display_name: string;
  summary: string | null;
  latest_version: string | null;
  updated_at_ms: number | null;
  installs_all_time: number | null;
  stars: number | null;
};

export default function SkillsClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const cityKey = searchParams.get("city") || DEFAULT_CITY_KEY;
  const city = getCity(cityKey);

  const [session, setSession] = useState<Session | null>(null);
  const userEmail = session?.user?.email ?? null;

  const [view, setView] = useState<ViewMode>("list");
  const [q, setQ] = useState("");
  const [items, setItems] = useState<ClawhubSkill[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    // Persist view preference
    try {
      const stored = window.localStorage.getItem("clawcon.skills.view");
      if (stored === "list" || stored === "grid") setView(stored);
    } catch {}

    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, newSession) => setSession(newSession),
    );

    return () => authListener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem("clawcon.skills.view", view);
    } catch {}
  }, [view]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const fetchSkills = useCallback(async () => {
    setLoading(true);
    setNotice(null);

    const { data, error } = await supabase
      .from("clawhub_skills")
      .select(
        "slug,display_name,summary,latest_version,updated_at_ms,installs_all_time,stars",
      )
      .order("updated_at_ms", { ascending: false, nullsFirst: false });

    if (error) {
      setItems([]);
      setNotice(
        "Skills database not configured yet (missing `clawhub_skills` table).",
      );
      setLoading(false);
      return;
    }

    setItems((data as ClawhubSkill[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchSkills();
  }, [fetchSkills]);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return items;
    return items.filter((s) => {
      if (s.slug.toLowerCase().includes(query)) return true;
      if (s.display_name.toLowerCase().includes(query)) return true;
      if ((s.summary || "").toLowerCase().includes(query)) return true;
      return false;
    });
  }, [items, q]);

  return (
    <>
      <div className="hn-header">
        <div className="hn-header-left">
          <Link href={withCity("/", city.key)} className="hn-logo">
            <span className="hn-logo-icon">🦞</span>
            <span className="hn-logo-text">Claw Con</span>
          </Link>
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
            <a href={withCity("/speakers", city.key)} className="hn-nav-link">
              speakers
            </a>
            <span className="hn-nav-sep">|</span>
            <a href={withCity("/sponsors", city.key)} className="hn-nav-link">
              sponsors
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
            <a href="/skills" className="hn-nav-link active">
              skills
            </a>
            <span className="hn-nav-sep">|</span>
            <a href={withCity("/memes", city.key)} className="hn-nav-link">
              memes
            </a>
            <span className="hn-nav-sep">|</span>
            <a
              href="https://t.me/clawcon"
              target="_blank"
              rel="noreferrer"
              className="hn-nav-link"
            >
              join telegram
            </a>
            <span className="hn-nav-sep">|</span>
            <a
              href="https://discord.gg/hhSCBayj"
              target="_blank"
              rel="noreferrer"
              className="hn-nav-link"
            >
              discord
            </a>
          </nav>

          <div className="hn-header-right">
            <label
              style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
            >
              <span style={{ color: "#000" }}>city</span>
              <select
                value={city.key}
                onChange={(e) => {
                  const next = e.target.value;
                  const nextUrl = new URL(window.location.href);
                  nextUrl.searchParams.set("city", next);
                  router.push(
                    `${nextUrl.pathname}?${nextUrl.searchParams.toString()}`,
                  );
                }}
                style={{ padding: "2px 6px" }}
                aria-label="Select city"
              >
                <option value="san-francisco">San Francisco</option>
                <option value="denver">Denver</option>
                <option value="tokyo">Tokyo</option>
                <option value="kona">Kona</option>
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
            <h2 style={{ margin: 0 }}>Skills</h2>
            <span style={{ color: "#6b7280", fontSize: 12 }}>
              Synced from{" "}
              <a
                href="https://clawhub.ai/api/v1/skills"
                target="_blank"
                rel="noreferrer"
              >
                clawhub.ai
              </a>
              .
            </span>
          </div>

          {loading ? (
            <p style={{ color: "#6b7280", marginTop: 12 }}>Loading…</p>
          ) : filtered.length === 0 ? (
            <p style={{ color: "#6b7280", marginTop: 12 }}>No skills found.</p>
          ) : view === "list" ? (
            <table className="hn-table" style={{ marginTop: 12 }}>
              <tbody>
                {filtered.map((s, idx) => (
                  <tr key={s.slug} className="hn-row">
                    <td className="hn-rank">{idx + 1}.</td>
                    <td className="hn-content">
                      <div className="hn-title-row">
                        <a
                          href={`https://clawhub.ai/skills/${s.slug}`}
                          target="_blank"
                          rel="noreferrer"
                          className="hn-title"
                        >
                          {s.display_name}
                        </a>
                        <span className="hn-domain">(clawhub.ai)</span>
                      </div>
                      <div className="hn-meta">
                        {s.latest_version ? (
                          <span>v{s.latest_version}</span>
                        ) : null}
                        {s.latest_version ? " | " : ""}
                        <span>{s.stars ?? 0} stars</span>
                        {" | "}
                        <span>{s.installs_all_time ?? 0} installs</span>
                      </div>
                      {s.summary ? (
                        <div className="hn-meta" style={{ marginTop: 4 }}>
                          {s.summary}
                        </div>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
                gap: 12,
                marginTop: 12,
              }}
            >
              {filtered.map((s) => (
                <a
                  key={s.slug}
                  href={`https://clawhub.ai/skills/${s.slug}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    border: "1px solid #e5e7eb",
                    borderRadius: 12,
                    padding: 14,
                    background: "#fff",
                    textDecoration: "none",
                    color: "inherit",
                  }}
                >
                  <div style={{ fontWeight: 900, marginBottom: 6 }}>
                    {s.display_name}
                  </div>
                  <div style={{ color: "#6b7280", fontSize: 12 }}>
                    {s.latest_version ? `v${s.latest_version}` : ""}
                    {s.latest_version ? " · " : ""}
                    {(s.stars ?? 0).toString()} stars
                    {" · "}
                    {(s.installs_all_time ?? 0).toString()} installs
                  </div>
                  {s.summary ? (
                    <div
                      style={{
                        color: "#111827",
                        fontSize: 12,
                        marginTop: 10,
                        lineHeight: 1.4,
                      }}
                    >
                      {s.summary}
                    </div>
                  ) : null}
                </a>
              ))}
            </div>
          )}
        </main>

        <aside className="hn-sidebar">
          <div className="hn-sidebar-box">
            <h3>Browse</h3>
            <div className="hn-form">
              <label>
                View
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    className="hn-button"
                    type="button"
                    onClick={() => setView("list")}
                    disabled={view === "list"}
                  >
                    List
                  </button>
                  <button
                    className="hn-button"
                    type="button"
                    onClick={() => setView("grid")}
                    disabled={view === "grid"}
                  >
                    Grid
                  </button>
                </div>
              </label>
              <label>
                Search
                <input
                  className="input"
                  placeholder="Search skills…"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                />
              </label>
            </div>
          </div>

          <div className="hn-sidebar-box">
            <h4>🔄 Sync</h4>
            <p style={{ margin: 0, color: "#6b7280", fontSize: 12 }}>
              Skills are synced from ClawHub into Supabase.
            </p>
          </div>
        </aside>
      </div>
    </>
  );
}
