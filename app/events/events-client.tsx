"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../../lib/supabaseClient";
import { DEFAULT_CITY_KEY, getCity, withCity } from "../../lib/cities";

type EventRow = {
  id: string;
  slug: string;
  name: string;
  category: string;
  city: string;
  month: string | null;
  year: number;
  starts_at: string | null;
  ends_at: string | null;
  is_public: boolean;
  created_at: string;
};

const MONTHS = [
  "jan",
  "feb",
  "mar",
  "apr",
  "may",
  "jun",
  "jul",
  "aug",
  "sep",
  "oct",
  "nov",
  "dec",
] as const;

type ViewMode = "list" | "grid";

type CategoryKey = "demo-day" | "workshop" | "meetup" | "conference";

function slugify(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function buildEventSlug(params: {
  category: string;
  city: string;
  month: string | null;
  year: number;
}): string {
  const category = slugify(params.category);
  const city = slugify(params.city);
  const year = params.year;
  const month = params.month ? slugify(params.month) : null;
  return `claw-${category}-${city}-${month ? `${month}-` : ""}${year}`;
}

export default function EventsClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const cityKey = searchParams.get("city") || DEFAULT_CITY_KEY;
  const city = getCity(cityKey);

  const [session, setSession] = useState<Session | null>(null);
  const userEmail = session?.user?.email ?? null;
  const [events, setEvents] = useState<EventRow[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [view, setView] = useState<ViewMode>("grid");

  // Form state
  const [name, setName] = useState("");
  const [category, setCategory] = useState<CategoryKey>("demo-day");
  const [cityName, setCityName] = useState(city.label);
  const [month, setMonth] = useState<string>("feb");
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const slugPreview = useMemo(() => {
    return buildEventSlug({
      category,
      city: cityName,
      month: month || null,
      year,
    });
  }, [category, cityName, month, year]);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    setNotice(null);

    const { data, error } = await supabase
      .from("events")
      .select(
        "id,slug,name,category,city,month,year,starts_at,ends_at,is_public,created_at",
      )
      .eq("is_public", true)
      .order("starts_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false });

    if (error) {
      setEvents([]);
      setNotice("Events database not configured yet (missing `events` table).");
      setLoading(false);
      return;
    }

    setEvents((data as EventRow[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, newSession) => setSession(newSession),
    );

    fetchEvents();

    // Load view pref
    try {
      const stored = window.localStorage.getItem("clawcon.events.view");
      if (stored === "list" || stored === "grid") setView(stored);
    } catch {}

    return () => authListener.subscription.unsubscribe();
  }, [fetchEvents]);

  useEffect(() => {
    try {
      window.localStorage.setItem("clawcon.events.view", view);
    } catch {}
  }, [view]);

  useEffect(() => {
    setCityName(city.label);
  }, [city.label]);

  const filtered = useMemo(() => {
    const cityLabel = city.label.toLowerCase();
    return events.filter((e) => e.city.toLowerCase().includes(cityLabel));
  }, [events, city.label]);

  const canCreate = Boolean(session);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setNotice(null);

    if (!session) {
      setNotice("Sign in to submit an event.");
      return;
    }

    const finalName = name.trim();
    if (!finalName) {
      setNotice("Name is required.");
      return;
    }

    setSubmitting(true);

    const payload = {
      slug: slugPreview,
      name: finalName,
      category,
      city: cityName.trim() || city.label,
      month: month || null,
      year,
      starts_at: startsAt ? new Date(startsAt).toISOString() : null,
      ends_at: endsAt ? new Date(endsAt).toISOString() : null,
      is_public: isPublic,
    };

    const { error } = await supabase.from("events").insert(payload);

    setSubmitting(false);

    if (error) {
      setNotice(error.message);
      return;
    }

    setName("");
    setNotice("Event submitted!");
    fetchEvents();
  };

  return (
    <>
      <div className="hn-header">
        <div className="hn-header-left">
          <Link href={withCity("/", city.key)} className="hn-logo">
            <span className="hn-logo-icon">🦞</span>
            <span className="hn-logo-text">Claw Con</span>
          </Link>
          <nav className="hn-nav">
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
            <span className="hn-nav-sep">|</span>

            <a href={withCity("/", city.key)} className="hn-nav-link">
              demos
            </a>
            <span className="hn-nav-sep">|</span>
            <a href={withCity("/", city.key)} className="hn-nav-link">
              topics
            </a>
            <span className="hn-nav-sep">|</span>
            <a
              href={withCity("/events", city.key)}
              className="hn-nav-link active"
            >
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
            <a href="/skills" className="hn-nav-link">
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

      {notice && <div className="hn-notice">{notice}</div>}

      <div className="hn-layout">
        <main className="hn-main">
          <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
            <h2 style={{ margin: 0 }}>Events · {city.label}</h2>
            <span style={{ color: "#6b7280", fontSize: 12 }}>
              Browse upcoming & past Claw Con events.
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
            <p style={{ color: "#6b7280" }}>Loading…</p>
          ) : filtered.length === 0 ? (
            <p style={{ color: "#6b7280" }}>No events yet for {city.label}.</p>
          ) : view === "list" ? (
            <table className="hn-table">
              <tbody>
                {filtered.map((e, idx) => (
                  <tr key={e.id} className="hn-row">
                    <td className="hn-rank">{idx + 1}.</td>
                    <td className="hn-content">
                      <div className="hn-title-row">
                        <span className="hn-title">{e.name}</span>
                        <span className="hn-domain">({e.city})</span>
                      </div>
                      <div className="hn-meta">
                        <span>
                          {e.category} · {e.month ? `${e.month} ` : ""}
                          {e.year}
                        </span>
                        {e.starts_at ? (
                          <>
                            {" "}
                            <span>
                              · {new Date(e.starts_at).toLocaleString()}
                            </span>
                          </>
                        ) : null}{" "}
                        · <code>{e.slug}</code>
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
              {filtered.map((e) => (
                <div
                  key={e.id}
                  style={{
                    border: "1px solid #e5e7eb",
                    borderRadius: 12,
                    padding: 14,
                    background: "#fff",
                  }}
                >
                  <div style={{ fontWeight: 800, marginBottom: 6 }}>
                    {e.name}
                  </div>
                  <div style={{ color: "#6b7280", fontSize: 12 }}>
                    {e.city} · {e.category}
                  </div>
                  <div style={{ color: "#111827", fontSize: 13, marginTop: 8 }}>
                    {e.month ? `${e.month} ` : ""}
                    {e.year}
                  </div>
                  {e.starts_at ? (
                    <div
                      style={{ color: "#6b7280", fontSize: 12, marginTop: 6 }}
                    >
                      {new Date(e.starts_at).toLocaleString()}
                    </div>
                  ) : null}
                  <div
                    style={{ color: "#6b7280", fontSize: 11, marginTop: 10 }}
                  >
                    <code>{e.slug}</code>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div style={{ marginTop: 14, color: "#6b7280", fontSize: 12 }}>
            Tip: switch cities on the submissions page; this page follows{" "}
            <code>?city=</code>.
          </div>
        </main>

        <aside className="hn-sidebar">
          <div className="hn-sidebar-box">
            <h3>Submit an Event</h3>
            {!canCreate ? (
              <div className="hn-signin-prompt">
                <p>Sign in on the submissions page to submit events.</p>
                <Link href={withCity("/", city.key)} className="hn-button">
                  Sign in
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="hn-form">
                <label>
                  Name
                  <input
                    className="input"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Claw Con SF Show & Tell"
                    required
                  />
                </label>

                <label>
                  Category
                  <select
                    className="input"
                    value={category}
                    onChange={(e) => setCategory(e.target.value as CategoryKey)}
                  >
                    <option value="demo-day">demo-day</option>
                    <option value="meetup">meetup</option>
                    <option value="workshop">workshop</option>
                    <option value="conference">conference</option>
                  </select>
                </label>

                <label>
                  City
                  <input
                    className="input"
                    type="text"
                    value={cityName}
                    onChange={(e) => setCityName(e.target.value)}
                    placeholder={city.label}
                  />
                </label>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 12,
                  }}
                >
                  <label>
                    Month
                    <select
                      className="input"
                      value={month}
                      onChange={(e) => setMonth(e.target.value)}
                    >
                      {MONTHS.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Year
                    <input
                      className="input"
                      type="number"
                      value={year}
                      onChange={(e) => setYear(Number(e.target.value))}
                      min={2020}
                      max={2100}
                    />
                  </label>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 12,
                  }}
                >
                  <label>
                    Starts (optional)
                    <input
                      className="input"
                      type="datetime-local"
                      value={startsAt}
                      onChange={(e) => setStartsAt(e.target.value)}
                    />
                  </label>
                  <label>
                    Ends (optional)
                    <input
                      className="input"
                      type="datetime-local"
                      value={endsAt}
                      onChange={(e) => setEndsAt(e.target.value)}
                    />
                  </label>
                </div>

                <label
                  style={{ display: "flex", alignItems: "center", gap: 10 }}
                >
                  <input
                    type="checkbox"
                    checked={isPublic}
                    onChange={(e) => setIsPublic(e.target.checked)}
                  />
                  <span>Public</span>
                </label>

                <div style={{ color: "#6b7280", fontSize: 12 }}>
                  Slug preview: <code>{slugPreview}</code>
                </div>

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

          <div className="hn-sidebar-box">
            <h4>📅 Event ideas</h4>
            <ul className="hn-ideas">
              <li>Monthly show & tell</li>
              <li>Lightning talks night</li>
              <li>Co-working / build day</li>
              <li>Agent safety workshop</li>
              <li>Hack night (small prizes)</li>
            </ul>
            <p className="hn-tip">
              Keep it small, repeatable, and easy to host.
            </p>
          </div>
        </aside>
      </div>
    </>
  );
}
