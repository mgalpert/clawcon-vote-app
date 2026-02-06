"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../../lib/supabaseClient";
import { DEFAULT_CITY_KEY, getCity, withCity } from "../../lib/cities";

type JobRow = {
  id: string;
  created_at: string;
  city: string;
  company: string;
  title: string;
  location: string | null;
  url: string;
  compensation: string | null;
  notes: string | null;
};

function safeUrl(input: string): string | null {
  try {
    const u = new URL(input);
    if (u.protocol !== "https:") return null;
    return u.toString();
  } catch {
    return null;
  }
}

export default function JobsClient() {
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

  const [rows, setRows] = useState<JobRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [view, setView] = useState<"list" | "grid">("list");

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem("clawcon.jobs.view");
      if (stored === "list" || stored === "grid") setView(stored);
    } catch {}
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem("clawcon.jobs.view", view);
    } catch {}
  }, [view]);

  const [formCompany, setFormCompany] = useState("");
  const [formTitle, setFormTitle] = useState("");
  const [formLocation, setFormLocation] = useState("");
  const [formUrl, setFormUrl] = useState("");
  const [formComp, setFormComp] = useState("");
  const [formNotes, setFormNotes] = useState("");

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

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    setNotice(null);

    const { data, error } = await supabase
      .from("jobs")
      .select(
        "id,created_at,city,company,title,location,url,compensation,notes",
      )
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) {
      setRows([]);
      setNotice("Jobs database not configured yet (missing `jobs` table). ");
      setLoading(false);
      return;
    }

    setRows((data as JobRow[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const filtered = useMemo(() => {
    const cityLabel = city.label;
    return rows.filter((r) => r.city === cityLabel);
  }, [rows, city.label]);

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
            <a href={withCity("/awards", city.key)} className="hn-nav-link">
              awards
            </a>
            <span className="hn-nav-sep">|</span>
            <a
              href={withCity("/jobs", city.key)}
              className="hn-nav-link active"
            >
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

      <div className="hn-city-rail" aria-label="City selector">
        <div className="hn-city-rail-label">Cities</div>
        <a
          className={city.key === "san-francisco" ? "active" : ""}
          href={withCity("/jobs", "san-francisco")}
        >
          San Francisco
        </a>
        <a
          className={city.key === "denver" ? "active" : ""}
          href={withCity("/jobs", "denver")}
        >
          Denver
        </a>
        <a
          className={city.key === "tokyo" ? "active" : ""}
          href={withCity("/jobs", "tokyo")}
        >
          Tokyo
        </a>
        <a
          className={city.key === "kona" ? "active" : ""}
          href={withCity("/jobs", "kona")}
        >
          Kona
        </a>
      </div>

      <div className="hn-layout">
        <main className="hn-main">
          <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
            <h2 style={{ margin: 0 }}>Jobs · {city.label}</h2>
            <span style={{ color: "#6b7280", fontSize: 12 }}>
              Post jobs for the community.
            </span>
          </div>

          <div style={{ margin: "10px 0 12px", display: "flex", gap: 8 }}>
            <button
              className="hn-button"
              onClick={() => setView("list")}
              disabled={view === "list"}
            >
              List
            </button>
            <button
              className="hn-button"
              onClick={() => setView("grid")}
              disabled={view === "grid"}
            >
              Grid
            </button>
          </div>

          {loading ? (
            <p style={{ color: "#6b7280", marginTop: 12 }}>Loading…</p>
          ) : filtered.length === 0 ? (
            <p style={{ color: "#6b7280", marginTop: 12 }}>
              No jobs yet for {city.label}.
            </p>
          ) : view === "list" ? (
            <table className="hn-table" style={{ marginTop: 12 }}>
              <tbody>
                {filtered.map((j, idx) => (
                  <tr key={j.id} className="hn-row">
                    <td className="hn-rank">{idx + 1}.</td>
                    <td className="hn-content">
                      <div className="hn-title-row">
                        <a
                          className="hn-title"
                          href={j.url}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {j.title}
                        </a>
                        <span className="hn-domain">({j.company})</span>
                      </div>
                      <div className="hn-meta">
                        {j.location ? <span>{j.location}</span> : null}
                        {j.location ? " · " : ""}
                        {j.compensation ? <span>{j.compensation}</span> : null}
                        {j.compensation ? " · " : ""}
                        {j.notes ? <span>{j.notes}</span> : null}
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
                gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
                gap: 12,
                marginTop: 12,
              }}
            >
              {filtered.map((j) => (
                <a
                  key={j.id}
                  href={j.url}
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
                    {j.title}
                  </div>
                  <div style={{ color: "#6b7280", fontSize: 12 }}>
                    {j.company}
                    {j.location ? ` · ${j.location}` : ""}
                    {j.compensation ? ` · ${j.compensation}` : ""}
                  </div>
                  {j.notes ? (
                    <div
                      style={{
                        color: "#111827",
                        fontSize: 12,
                        marginTop: 10,
                      }}
                    >
                      {j.notes}
                    </div>
                  ) : null}
                </a>
              ))}
            </div>
          )}
        </main>

        <aside className="hn-sidebar">
          <div className="hn-sidebar-box">
            <h4>➕ Submit a job</h4>

            {!session ? (
              <div className="hn-signin-prompt">
                <p>Sign in on the submissions page to post jobs.</p>
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
                    setNotice("Job URL must be a valid https URL.");
                    return;
                  }

                  if (!formCompany.trim() || !formTitle.trim()) {
                    setNotice("Company and title are required.");
                    return;
                  }

                  setSubmitting(true);
                  const { error } = await supabase.from("jobs").insert({
                    city: city.label,
                    company: formCompany.trim(),
                    title: formTitle.trim(),
                    location: formLocation.trim() || null,
                    url: u,
                    compensation: formComp.trim() || null,
                    notes: formNotes.trim() || null,
                  });
                  setSubmitting(false);

                  if (error) {
                    setNotice(error.message);
                    return;
                  }

                  setFormCompany("");
                  setFormTitle("");
                  setFormLocation("");
                  setFormUrl("");
                  setFormComp("");
                  setFormNotes("");
                  fetchJobs();
                }}
              >
                <label>
                  Company
                  <input
                    className="input"
                    type="text"
                    placeholder="Acme Co"
                    value={formCompany}
                    onChange={(e) => setFormCompany(e.target.value)}
                    required
                  />
                </label>

                <label>
                  Title
                  <input
                    className="input"
                    type="text"
                    placeholder="Founding engineer"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    required
                  />
                </label>

                <label>
                  Location (optional)
                  <input
                    className="input"
                    type="text"
                    placeholder="SF / Remote"
                    value={formLocation}
                    onChange={(e) => setFormLocation(e.target.value)}
                  />
                </label>

                <label>
                  URL
                  <input
                    className="input"
                    type="text"
                    placeholder="https://jobs..."
                    value={formUrl}
                    onChange={(e) => setFormUrl(e.target.value)}
                    required
                  />
                </label>

                <label>
                  Compensation (optional)
                  <input
                    className="input"
                    type="text"
                    placeholder="$150k–$200k + equity"
                    value={formComp}
                    onChange={(e) => setFormComp(e.target.value)}
                  />
                </label>

                <label>
                  Notes (optional)
                  <input
                    className="input"
                    type="text"
                    placeholder="Visa, stack, team size…"
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                  />
                </label>

                <button
                  className="hn-button"
                  type="submit"
                  disabled={submitting}
                >
                  {submitting ? "Submitting..." : "Submit"}
                </button>

                <p className="hn-tip" style={{ margin: 0 }}>
                  Use a link with a clear job description.
                </p>
              </form>
            )}
          </div>

          <div className="hn-sidebar-box">
            <h4>✅ Tips</h4>
            <ul className="hn-ideas">
              <li>Include location + remote/visa info if you can.</li>
              <li>Use a stable URL (careers page or job post).</li>
            </ul>
          </div>
        </aside>
      </div>
    </>
  );
}
