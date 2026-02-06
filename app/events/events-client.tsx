"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
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

type CategoryKey = "show-tell" | "workshop" | "meetup" | "conference";

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
  const searchParams = useSearchParams();
  const cityKey = searchParams.get("city") || DEFAULT_CITY_KEY;
  const city = getCity(cityKey);

  const [session, setSession] = useState<Session | null>(null);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [view, setView] = useState<ViewMode>("grid");

  // Form state
  const [name, setName] = useState("");
  const [category, setCategory] = useState<CategoryKey>("show-tell");
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
    <main style={{ padding: 24, maxWidth: 1200, margin: "0 auto" }}>
      <header style={{ marginBottom: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 6 }}>
              Events
            </h1>
            <p style={{ color: "#4b5563", margin: 0 }}>
              {city.label} · Browse upcoming & past Claw Con events.
            </p>
          </div>

          <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
            <Link href={withCity("/", city.key)} className="hn-button">
              ← submissions
            </Link>
          </div>
        </div>

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

        {notice && <div className="hn-notice">{notice}</div>}
      </header>

      <section style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 10 }}>
          Submit an event
        </h2>

        {!canCreate ? (
          <p style={{ color: "#6b7280" }}>
            Sign in on the submissions page to submit events.
          </p>
        ) : null}

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
              disabled={!canCreate}
            />
          </label>

          <label>
            Category
            <select
              className="input"
              value={category}
              onChange={(e) => setCategory(e.target.value as CategoryKey)}
              disabled={!canCreate}
            >
              <option value="show-tell">show-tell</option>
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
              placeholder="San Francisco"
              disabled={!canCreate}
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
                disabled={!canCreate}
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
                disabled={!canCreate}
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
                disabled={!canCreate}
              />
            </label>
            <label>
              Ends (optional)
              <input
                className="input"
                type="datetime-local"
                value={endsAt}
                onChange={(e) => setEndsAt(e.target.value)}
                disabled={!canCreate}
              />
            </label>
          </div>

          <label style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <input
              type="checkbox"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
              disabled={!canCreate}
            />
            <span>Public</span>
          </label>

          <div style={{ color: "#6b7280", fontSize: 12 }}>
            Slug preview: <code>{slugPreview}</code>
          </div>

          <button
            className="hn-button"
            type="submit"
            disabled={!canCreate || submitting}
          >
            {submitting ? "Submitting..." : "Submit event"}
          </button>
        </form>
      </section>

      <section>
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 10 }}>
          {city.label} events
        </h2>

        {loading ? (
          <p style={{ color: "#6b7280" }}>Loading…</p>
        ) : filtered.length === 0 ? (
          <p style={{ color: "#6b7280" }}>No events yet for {city.label}.</p>
        ) : view === "list" ? (
          <div style={{ border: "1px solid #e5e7eb", borderRadius: 10 }}>
            {filtered.map((e, idx) => (
              <div
                key={e.id}
                style={{
                  padding: 12,
                  borderBottom:
                    idx === filtered.length - 1 ? "none" : "1px solid #e5e7eb",
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 12,
                }}
              >
                <div>
                  <div style={{ fontWeight: 700 }}>{e.name}</div>
                  <div style={{ color: "#6b7280", fontSize: 12 }}>
                    {e.city} · {e.category} · {e.month ? `${e.month} ` : ""}
                    {e.year}
                  </div>
                  <div style={{ color: "#6b7280", fontSize: 12 }}>
                    <code>{e.slug}</code>
                  </div>
                </div>
                <div style={{ color: "#6b7280", fontSize: 12 }}>
                  {e.starts_at ? new Date(e.starts_at).toLocaleString() : ""}
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
                <div style={{ fontWeight: 800, marginBottom: 6 }}>{e.name}</div>
                <div
                  style={{ color: "#6b7280", fontSize: 12, marginBottom: 8 }}
                >
                  {e.city} · {e.category}
                </div>
                <div style={{ color: "#111827", fontSize: 13 }}>
                  {e.month ? `${e.month} ` : ""}
                  {e.year}
                </div>
                {e.starts_at ? (
                  <div style={{ color: "#6b7280", fontSize: 12, marginTop: 6 }}>
                    {new Date(e.starts_at).toLocaleString()}
                  </div>
                ) : null}
                <div style={{ color: "#6b7280", fontSize: 11, marginTop: 10 }}>
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
      </section>
    </main>
  );
}
