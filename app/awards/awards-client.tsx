"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../../lib/supabaseClient";
import { DEFAULT_CITY_KEY, getCity, withCity } from "../../lib/cities";
import CitySelect from "../city-select";
import MobileNav from "../mobile-nav";

type AwardKind = "prize" | "grant" | "challenge" | "bounty";

type AwardRow = {
  id: string;
  created_at: string;
  city: string;
  kind: AwardKind;
  sponsor_name: string;
  title: string;
  description: string;
  url: string | null;
  amount: string | null;
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

export default function AwardsClient() {
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

  const [rows, setRows] = useState<AwardRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [view, setView] = useState<"list" | "grid">("list");

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem("clawcon.awards.view");
      if (stored === "list" || stored === "grid") setView(stored);
    } catch {}
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem("clawcon.awards.view", view);
    } catch {}
  }, [view]);

  const [formKind, setFormKind] = useState<AwardKind>("prize");
  const [formSponsor, setFormSponsor] = useState("");
  const [formTitle, setFormTitle] = useState("");
  const [formAmount, setFormAmount] = useState("");
  const [formUrl, setFormUrl] = useState("");
  const [formDescription, setFormDescription] = useState("");

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

  const fetchAwards = useCallback(async () => {
    setLoading(true);
    setNotice(null);

    const { data, error } = await supabase
      .from("awards")
      .select(
        "id,created_at,city,kind,sponsor_name,title,description,url,amount",
      )
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) {
      setRows([]);
      setNotice("Awards database not configured yet (missing `awards` table).");
      setLoading(false);
      return;
    }

    setRows((data as AwardRow[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAwards();
  }, [fetchAwards]);

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

          <CitySelect path="/awards" activeCityKey={city.key} />
          <MobileNav cityKey={city.key} activePath="/awards" />

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
            <a
              href={withCity("/awards", city.key)}
              className="hn-nav-link active"
            >
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
            <h2 style={{ margin: 0 }}>Awards · {city.label}</h2>
            <span style={{ color: "#6b7280", fontSize: 12 }}>
              Prizes, grants, challenges, and bounties.
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
              No awards yet for {city.label}.
            </p>
          ) : view === "list" ? (
            <table className="hn-table" style={{ marginTop: 12 }}>
              <tbody>
                {filtered.map((a, idx) => (
                  <tr key={a.id} className="hn-row">
                    <td className="hn-rank">{idx + 1}.</td>
                    <td className="hn-content">
                      <div className="hn-title-row">
                        {a.url ? (
                          <a
                            className="hn-title"
                            href={a.url}
                            target="_blank"
                            rel="noreferrer"
                          >
                            {a.title}
                          </a>
                        ) : (
                          <span className="hn-title">{a.title}</span>
                        )}
                        <span className="hn-domain">
                          ({a.kind} · {a.sponsor_name})
                        </span>
                      </div>
                      <div className="hn-meta">
                        {a.amount ? <span>{a.amount}</span> : null}
                        {a.amount ? " · " : ""}
                        <span>{a.description}</span>
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
              {filtered.map((a) => (
                <div
                  key={a.id}
                  style={{
                    border: "1px solid #e5e7eb",
                    borderRadius: 12,
                    padding: 14,
                    background: "#fff",
                  }}
                >
                  <div style={{ fontWeight: 900, marginBottom: 6 }}>
                    {a.url ? (
                      <a
                        href={a.url}
                        target="_blank"
                        rel="noreferrer"
                        style={{ color: "inherit", textDecoration: "none" }}
                      >
                        {a.title}
                      </a>
                    ) : (
                      a.title
                    )}
                  </div>
                  <div style={{ color: "#6b7280", fontSize: 12 }}>
                    {a.kind} · {a.sponsor_name}
                    {a.amount ? ` · ${a.amount}` : ""}
                  </div>
                  <div
                    style={{ color: "#111827", fontSize: 12, marginTop: 10 }}
                  >
                    {a.description}
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>

        <aside className="hn-sidebar">
          <div className="hn-sidebar-box">
            <h4>➕ Submit an award</h4>

            {!session ? (
              <div className="hn-signin-prompt">
                <p>Sign in on the submissions page to add awards.</p>
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

                  if (!formSponsor.trim()) {
                    setNotice("Sponsor name is required.");
                    return;
                  }
                  if (!formTitle.trim()) {
                    setNotice("Title is required.");
                    return;
                  }
                  if (!formDescription.trim()) {
                    setNotice("Description is required.");
                    return;
                  }

                  const u = safeUrl(formUrl.trim());
                  if (formUrl.trim() && !u) {
                    setNotice("URL must be a valid https URL (or blank). ");
                    return;
                  }

                  setSubmitting(true);
                  const { error } = await supabase.from("awards").insert({
                    city: city.label,
                    kind: formKind,
                    sponsor_name: formSponsor.trim(),
                    title: formTitle.trim(),
                    description: formDescription.trim(),
                    url: u,
                    amount: formAmount.trim() || null,
                  });
                  setSubmitting(false);

                  if (error) {
                    setNotice(error.message);
                    return;
                  }

                  setFormSponsor("");
                  setFormTitle("");
                  setFormDescription("");
                  setFormUrl("");
                  setFormAmount("");
                  fetchAwards();
                }}
              >
                <label>
                  Type
                  <select
                    className="input"
                    value={formKind}
                    onChange={(e) => setFormKind(e.target.value as AwardKind)}
                  >
                    <option value="prize">prize</option>
                    <option value="grant">grant</option>
                    <option value="challenge">challenge</option>
                    <option value="bounty">bounty</option>
                  </select>
                </label>

                <label>
                  Sponsor name
                  <input
                    className="input"
                    type="text"
                    placeholder="Acme Co"
                    value={formSponsor}
                    onChange={(e) => setFormSponsor(e.target.value)}
                    required
                  />
                </label>

                <label>
                  Title
                  <input
                    className="input"
                    type="text"
                    placeholder="Best demo"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    required
                  />
                </label>

                <label>
                  Amount (optional)
                  <input
                    className="input"
                    type="text"
                    placeholder="$500 / credits / hardware / etc"
                    value={formAmount}
                    onChange={(e) => setFormAmount(e.target.value)}
                  />
                </label>

                <label>
                  URL (optional)
                  <input
                    className="input"
                    type="text"
                    placeholder="https://..."
                    value={formUrl}
                    onChange={(e) => setFormUrl(e.target.value)}
                  />
                </label>

                <label>
                  Description
                  <textarea
                    className="input"
                    style={{ minHeight: 100, resize: "vertical" }}
                    placeholder="What is it, eligibility, how to claim..."
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    required
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
                  Keep it short + include how to claim.
                </p>
              </form>
            )}
          </div>

          <div className="hn-sidebar-box">
            <h4>✅ Tips</h4>
            <ul className="hn-ideas">
              <li>
                Use <b>challenge</b> for a specific problem, <b>bounty</b> for a
                reward per issue/PR.
              </li>
              <li>
                If there’s a URL, link to rules / submission form / terms.
              </li>
            </ul>
          </div>
        </aside>
      </div>
    </>
  );
}
