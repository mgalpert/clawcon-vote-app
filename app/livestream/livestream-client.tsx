"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../../lib/supabaseClient";
import { DEFAULT_CITY_KEY, getCity, withCity } from "../../lib/cities";

export default function LivestreamClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const cityKey = searchParams.get("city") || DEFAULT_CITY_KEY;
  const city = getCity(cityKey);

  const [session, setSession] = useState<Session | null>(null);
  const userEmail = session?.user?.email ?? null;

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

  const url = useMemo(() => city.livestreamUrl || null, [city.livestreamUrl]);

  const [formUrl, setFormUrl] = useState("");
  const [formNotes, setFormNotes] = useState("");

  const mailtoHref = useMemo(() => {
    const subject = `Claw Con livestream link (${city.label})`;
    const bodyLines = [
      `City: ${city.label}`,
      `Livestream URL: ${formUrl.trim() || "(missing)"}`,
      formNotes.trim() ? `Notes: ${formNotes.trim()}` : null,
      "",
      "Suggested setup: StreamYard (recording + easy sharing).",
    ].filter(Boolean) as string[];

    const body = bodyLines.join("\n");
    return `mailto:colin@clawdcon.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }, [city.label, formNotes, formUrl]);

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

      <div className="hn-layout">
        <main className="hn-main">
          <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
            <h2 style={{ margin: 0 }}>Livestream · {city.label}</h2>
            <span style={{ color: "#6b7280", fontSize: 12 }}>
              Watch the stream/recording.
            </span>
          </div>

          {url ? (
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
                  src={url}
                  title={`Claw Con ${city.label} Livestream`}
                  allow="autoplay; fullscreen; picture-in-picture"
                  allowFullScreen
                  style={{ width: "100%", height: "100%", border: 0 }}
                />
              </div>

              <p style={{ marginTop: 12, color: "#6b7280" }}>
                If the embed doesn’t load, open it here: <a href={url}>{url}</a>
              </p>
            </>
          ) : (
            <p style={{ marginTop: 12, color: "#6b7280" }}>
              No livestream link added yet for {city.label}.
            </p>
          )}
        </main>

        <aside className="hn-sidebar">
          <div className="hn-sidebar-box">
            <h3>Submit a livestream</h3>
            <form
              className="hn-form"
              onSubmit={(e) => {
                e.preventDefault();
                window.location.href = mailtoHref;
              }}
            >
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
              <button className="hn-button" type="submit">
                Email Colin
              </button>
              <p className="hn-tip" style={{ margin: 0 }}>
                This opens your email client to coordinate.
              </p>
            </form>
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
              <li>
                Coordinate with{" "}
                <a href="mailto:colin@clawdcon.com">colin@clawdcon.com</a> to
                get the link posted.
              </li>
            </ul>
          </div>
        </aside>
      </div>
    </>
  );
}
