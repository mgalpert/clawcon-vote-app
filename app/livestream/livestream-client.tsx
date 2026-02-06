"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../../lib/supabaseClient";
import { DEFAULT_CITY_KEY, getCity, withCity } from "../../lib/cities";

type ViewMode = "grid" | "list";

type LivestreamRow = {
  id: string;
  city: string;
  title: string | null;
  url: string;
  notes: string | null;
  created_at: string;
};

function safeUrl(s: string): string | null {
  try {
    const u = new URL(s);
    if (u.protocol !== "https:") return null;
    if (u.username || u.password) return null;
    return u.toString();
  } catch {
    return null;
  }
}

export default function LivestreamClient() {
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

  const defaultUrl = useMemo(
    () => city.livestreamUrl || null,
    [city.livestreamUrl],
  );

  const [view, setView] = useState<ViewMode>("grid");
  const [items, setItems] = useState<LivestreamRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);

  const [formTitle, setFormTitle] = useState("");
  const [formUrl, setFormUrl] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const mailtoHref = useMemo(() => {
    const subject = `Claw Con livestream link (${city.label})`;
    const bodyLines = [
      `City: ${city.label}`,
      `Title: ${formTitle.trim() || "(none)"}`,
      `Livestream URL: ${formUrl.trim() || "(missing)"}`,
      formNotes.trim() ? `Notes: ${formNotes.trim()}` : null,
      "",
      "Suggested setup: StreamYard (recording + easy sharing).",
    ].filter(Boolean) as string[];

    const body = bodyLines.join("\n");
    return `mailto:colin@clawdcon.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }, [city.label, formNotes, formTitle, formUrl]);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem("clawcon.livestream.view");
      if (stored === "list" || stored === "grid") setView(stored);
    } catch {}
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem("clawcon.livestream.view", view);
    } catch {}
  }, [view]);

  const fetchLivestreams = useCallback(async () => {
    setLoading(true);
    setNotice(null);

    const { data, error } = await supabase
      .from("livestreams")
      .select("id,city,title,url,notes,created_at")
      .eq("city", city.label)
      .order("created_at", { ascending: false });

    if (error) {
      setItems([]);
      setNotice(
        "Livestreams database not configured yet (missing `livestreams` table).",
      );
      setLoading(false);
      return;
    }

    setItems((data as LivestreamRow[]) || []);
    setLoading(false);
  }, [city.label]);

  useEffect(() => {
    fetchLivestreams();
  }, [fetchLivestreams]);

  const hero = items[0] || null;
  const heroUrl = hero?.url || defaultUrl;
  const rest = items.slice(1);

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
            <a
              href={withCity("/livestream", city.key)}
              className="hn-nav-link active"
            >
              livestream
            </a>
            <span className="hn-nav-sep">|</span>
            <a href={withCity("/chats", city.key)} className="hn-nav-link">
              join the chat
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
              <span style={{ color: "#000" }}>lang</span>
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

      <div className="hn-city-rail" aria-label="City selector">
        <div className="hn-city-rail-label">Cities</div>
        <a
          className={city.key === "san-francisco" ? "active" : ""}
          href={withCity("/livestream", "san-francisco")}
        >
          San Francisco
        </a>
        <a
          className={city.key === "denver" ? "active" : ""}
          href={withCity("/livestream", "denver")}
        >
          Denver
        </a>
        <a
          className={city.key === "tokyo" ? "active" : ""}
          href={withCity("/livestream", "tokyo")}
        >
          Tokyo
        </a>
        <a
          className={city.key === "kona" ? "active" : ""}
          href={withCity("/livestream", "kona")}
        >
          Kona
        </a>
      </div>

      <div className="hn-layout">
        <main className="hn-main">
          <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
            <h2 style={{ margin: 0 }}>Livestream · {city.label}</h2>
            <span style={{ color: "#6b7280", fontSize: 12 }}>
              Watch the stream/recording.
            </span>
          </div>

          {notice && <div className="hn-notice">{notice}</div>}

          {heroUrl ? (
            <>
              <div
                style={{
                  marginTop: 12,
                  width: "100%",
                  aspectRatio: "16 / 9",
                  border: "1px solid #e5e7eb",
                  borderRadius: 12,
                  overflow: "hidden",
                  background: "#000",
                }}
              >
                <iframe
                  src={heroUrl}
                  title={`Claw Con ${city.label} Livestream`}
                  allow="autoplay; fullscreen; picture-in-picture"
                  allowFullScreen
                  style={{ width: "100%", height: "100%", border: 0 }}
                />
              </div>

              <p style={{ marginTop: 12, color: "#6b7280" }}>
                If the embed doesn’t load, open it here:{" "}
                <a href={heroUrl} target="_blank" rel="noreferrer">
                  {heroUrl}
                </a>
              </p>
            </>
          ) : (
            <p style={{ marginTop: 12, color: "#6b7280" }}>
              No livestreams yet for {city.label}.
            </p>
          )}

          <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
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
          </div>

          {loading ? (
            <p style={{ color: "#6b7280", marginTop: 12 }}>Loading…</p>
          ) : rest.length === 0 ? (
            <p style={{ color: "#6b7280", marginTop: 12 }}>
              No additional livestreams yet.
            </p>
          ) : view === "list" ? (
            <table className="hn-table" style={{ marginTop: 12 }}>
              <tbody>
                {rest.map((s, idx) => (
                  <tr key={s.id} className="hn-row">
                    <td className="hn-rank">{idx + 1}.</td>
                    <td className="hn-content">
                      <div className="hn-title-row">
                        <a
                          className="hn-title"
                          href={s.url}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {s.title || "Livestream"}
                        </a>
                        <span className="hn-domain">({city.label})</span>
                      </div>
                      <div className="hn-meta">
                        <span>{new Date(s.created_at).toLocaleString()}</span>
                        {s.notes ? (
                          <>
                            {" "}
                            · <span>{s.notes}</span>
                          </>
                        ) : null}
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
              {rest.map((s) => (
                <a
                  key={s.id}
                  href={s.url}
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
                    {s.title || "Livestream"}
                  </div>
                  <div style={{ color: "#6b7280", fontSize: 12 }}>
                    {new Date(s.created_at).toLocaleString()}
                  </div>
                  {s.notes ? (
                    <div
                      style={{ color: "#111827", fontSize: 12, marginTop: 10 }}
                    >
                      {s.notes}
                    </div>
                  ) : null}
                </a>
              ))}
            </div>
          )}
        </main>

        <aside className="hn-sidebar">
          <div className="hn-sidebar-box">
            <h3>Submit a livestream</h3>
            {!session ? (
              <div className="hn-signin-prompt">
                <p>Sign in on the submissions page to add livestreams.</p>
                <Link href={withCity("/", city.key)} className="hn-button">
                  Sign in
                </Link>
              </div>
            ) : (
              <form
                className="hn-form"
                onSubmit={async (e) => {
                  e.preventDefault();
                  setNotice(null);

                  const u = safeUrl(formUrl.trim());
                  if (!u) {
                    setNotice("Livestream URL must be a valid https URL.");
                    return;
                  }

                  setSubmitting(true);
                  const { error } = await supabase.from("livestreams").insert({
                    city: city.label,
                    title: formTitle.trim() || null,
                    url: u,
                    notes: formNotes.trim() || null,
                  });
                  setSubmitting(false);

                  if (error) {
                    setNotice(error.message);
                    return;
                  }

                  setFormTitle("");
                  setFormUrl("");
                  setFormNotes("");
                  fetchLivestreams();
                }}
              >
                <label>
                  Title (optional)
                  <input
                    className="input"
                    type="text"
                    placeholder="Claw Con SF stream"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                  />
                </label>
                <label>
                  Livestream URL
                  <input
                    className="input"
                    type="text"
                    placeholder="https://streamyard.com/watch/..."
                    value={formUrl}
                    onChange={(e) => setFormUrl(e.target.value)}
                    required
                  />
                </label>
                <label>
                  Notes (optional)
                  <input
                    className="input"
                    type="text"
                    placeholder="Time, host, agenda, etc."
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                  />
                </label>

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button
                    className="hn-button"
                    type="submit"
                    disabled={submitting}
                  >
                    {submitting ? "Submitting..." : "Submit"}
                  </button>
                </div>

                <p className="hn-tip" style={{ margin: 0 }}>
                  Add the livestream link for this city.
                </p>
              </form>
            )}
          </div>

          <div className="hn-sidebar-box">
            <h4>✅ Suggestions</h4>
            <ul className="hn-ideas">
              <li>
                Use{" "}
                <a
                  href="https://streamyard.com"
                  target="_blank"
                  rel="noreferrer"
                >
                  StreamYard
                </a>{" "}
                for reliable streaming + recording.
              </li>
              {/* removed */}
            </ul>
          </div>
        </aside>
      </div>
    </>
  );
}
