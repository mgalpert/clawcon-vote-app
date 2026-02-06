"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { Session } from "@supabase/supabase-js";
import CitySelect from "../city-select";
import MobileNav from "../mobile-nav";
import { supabase } from "../../lib/supabaseClient";
import { DEFAULT_CITY_KEY, getCity, withCity } from "../../lib/cities";

type PaperType = "whitepaper" | "research" | "academic" | "other";

type PaperRow = {
  id: string;
  created_at: string;
  city: string;
  title: string;
  paper_type: PaperType;
  authors: string;
  url: string | null;
  abstract: string | null;
};

function safeUrl(input: string): string | null {
  if (!input.trim()) return null;
  try {
    const u = new URL(input);
    if (u.protocol !== "https:") return null;
    return u.toString();
  } catch {
    return null;
  }
}

export default function PapersClient() {
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

  const [rows, setRows] = useState<PaperRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // form
  const [title, setTitle] = useState("");
  const [paperType, setPaperType] = useState<PaperType>("whitepaper");
  const [authors, setAuthors] = useState("");
  const [url, setUrl] = useState("");
  const [abstract, setAbstract] = useState("");

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

  const fetchPapers = useCallback(async () => {
    setLoading(true);
    setNotice(null);

    const { data, error } = await supabase
      .from("papers")
      .select("id,created_at,city,title,paper_type,authors,url,abstract")
      .order("created_at", { ascending: false })
      .limit(300);

    if (error) {
      setRows([]);
      setNotice("Papers database not configured yet (missing `papers` table).");
      setLoading(false);
      return;
    }

    setRows((data as PaperRow[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchPapers();
  }, [fetchPapers]);

  const filtered = useMemo(() => {
    return rows.filter((r) => r.city === city.label);
  }, [rows, city.label]);

  return (
    <>
      <div className="hn-header">
        <div className="hn-header-left">
          <Link href={withCity("/", city.key)} className="hn-logo">
            <span className="hn-logo-icon">🦞</span>
            <span className="hn-logo-text">Claw Con</span>
          </Link>

          <CitySelect path="/papers" activeCityKey={city.key} />

          <MobileNav cityKey={city.key} activePath="/papers" />

          <nav className="hn-nav">
            <a href={withCity("/", city.key)} className="hn-nav-link">
              projects
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
            <a href={withCity("/robots", city.key)} className="hn-nav-link">
              robots
            </a>
            <span className="hn-nav-sep">|</span>
            <a
              href={withCity("/papers", city.key)}
              className="hn-nav-link active"
            >
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

      <div className="hn-layout">
        <main className="hn-main">
          <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
            <h2 style={{ margin: 0 }}>Papers · {city.label}</h2>
            <span style={{ color: "#6b7280", fontSize: 12 }}>
              Whitepapers, research, academic notes, or anything else.
            </span>
          </div>

          {loading ? (
            <p style={{ color: "#6b7280", marginTop: 12 }}>Loading…</p>
          ) : filtered.length === 0 ? (
            <p style={{ color: "#6b7280", marginTop: 12 }}>
              No papers yet for {city.label}.
            </p>
          ) : (
            <table className="hn-table" style={{ marginTop: 12 }}>
              <tbody>
                {filtered.map((p, idx) => (
                  <tr key={p.id} className="hn-row">
                    <td className="hn-rank">{idx + 1}.</td>
                    <td className="hn-content">
                      <div className="hn-title-row">
                        {p.url ? (
                          <a
                            className="hn-title"
                            href={p.url}
                            target="_blank"
                            rel="noreferrer"
                          >
                            {p.title}
                          </a>
                        ) : (
                          <span className="hn-title">{p.title}</span>
                        )}
                        <span className="hn-domain">({p.paper_type})</span>
                      </div>
                      <div className="hn-meta">
                        <span>{p.authors}</span>
                        {p.abstract ? (
                          <>
                            {" "}
                            <span>·</span> <span>{p.abstract}</span>
                          </>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </main>

        <aside className="hn-sidebar">
          <div className="hn-sidebar-box">
            <h4>➕ Submit a paper</h4>

            {!session ? (
              <div className="hn-signin-prompt">
                <p>Sign in on the projects page to submit papers.</p>
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

                  if (!title.trim()) {
                    setNotice("Title is required.");
                    return;
                  }
                  if (!authors.trim()) {
                    setNotice("Authors is required.");
                    return;
                  }

                  const u = safeUrl(url.trim());
                  if (url.trim() && !u) {
                    setNotice("URL must be a valid https URL (or blank). ");
                    return;
                  }

                  setSubmitting(true);
                  const { error } = await supabase.from("papers").insert({
                    city: city.label,
                    title: title.trim(),
                    paper_type: paperType,
                    authors: authors.trim(),
                    url: u,
                    abstract: abstract.trim() || null,
                  });
                  setSubmitting(false);

                  if (error) {
                    setNotice(error.message);
                    return;
                  }

                  setTitle("");
                  setPaperType("whitepaper");
                  setAuthors("");
                  setUrl("");
                  setAbstract("");
                  fetchPapers();
                }}
              >
                <label>
                  Title
                  <input
                    className="input"
                    type="text"
                    placeholder="Title of your paper"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                  />
                </label>

                <label>
                  Type
                  <select
                    className="input"
                    value={paperType}
                    onChange={(e) => setPaperType(e.target.value as PaperType)}
                  >
                    <option value="whitepaper">whitepaper</option>
                    <option value="research">research</option>
                    <option value="academic">academic</option>
                    <option value="other">other</option>
                  </select>
                </label>

                <label>
                  Authors
                  <input
                    className="input"
                    type="text"
                    placeholder="Name1, Name2"
                    value={authors}
                    onChange={(e) => setAuthors(e.target.value)}
                    required
                  />
                </label>

                <label>
                  URL (optional)
                  <input
                    className="input"
                    type="text"
                    placeholder="https://..."
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                  />
                </label>

                <label>
                  Abstract / note (optional)
                  <textarea
                    className="input"
                    placeholder="1-3 sentences"
                    value={abstract}
                    onChange={(e) => setAbstract(e.target.value)}
                    rows={4}
                    style={{ resize: "vertical" }}
                  />
                </label>

                <button
                  className="hn-button"
                  type="submit"
                  disabled={submitting}
                >
                  {submitting ? "Submitting..." : "Submit"}
                </button>
              </form>
            )}
          </div>
        </aside>
      </div>
    </>
  );
}
