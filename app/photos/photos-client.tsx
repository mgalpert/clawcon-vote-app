"use client";

import sfPhotos from "./sfPhotos.json";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../../lib/supabaseClient";
import { DEFAULT_CITY_KEY, getCity, withCity } from "../../lib/cities";

// Placeholder: add mp4 URLs here as we collect them.
const sfVideos: string[] = [];

function MediaGrid({ urls }: { urls: string[] }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
        gap: 12,
      }}
    >
      {urls.map((url) => (
        <a
          key={url}
          href={url}
          target="_blank"
          rel="noreferrer"
          style={{
            display: "block",
            border: "1px solid #e5e7eb",
            borderRadius: 8,
            overflow: "hidden",
            background: "#fff",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt="Claw Con photo"
            loading="lazy"
            style={{
              width: "100%",
              height: 220,
              objectFit: "cover",
              display: "block",
            }}
          />
        </a>
      ))}
    </div>
  );
}

export default function PhotosClient() {
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

  const photos = useMemo(() => {
    if (city.key === "san-francisco") return sfPhotos;
    return [];
  }, [city.key]);

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
            <a
              href={withCity("/photos", city.key)}
              className="hn-nav-link active"
            >
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

      <div className="hn-city-rail" aria-label="City selector">
        <div className="hn-city-rail-label">Cities</div>
        <a
          className={city.key === "san-francisco" ? "active" : ""}
          href={withCity("/photos", "san-francisco")}
        >
          San Francisco
        </a>
        <a
          className={city.key === "denver" ? "active" : ""}
          href={withCity("/photos", "denver")}
        >
          Denver
        </a>
        <a
          className={city.key === "tokyo" ? "active" : ""}
          href={withCity("/photos", "tokyo")}
        >
          Tokyo
        </a>
        <a
          className={city.key === "kona" ? "active" : ""}
          href={withCity("/photos", "kona")}
        >
          Kona
        </a>
      </div>

      <div className="hn-layout">
        <main className="hn-main">
          <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
            <h2 style={{ margin: 0 }}>Photos & Videos · {city.label}</h2>
            <span style={{ color: "#6b7280", fontSize: 12 }}>
              Photos from events.
            </span>
          </div>

          {city.key === "san-francisco" ? (
            <>
              <p style={{ marginTop: 10, marginBottom: 12, color: "#6b7280" }}>
                SF photos sourced from{" "}
                <a
                  href="https://www.raysurfer.com/blog/claw-con"
                  target="_blank"
                  rel="noreferrer"
                >
                  raysurfer.com/blog/claw-con
                </a>
                .
              </p>
              <MediaGrid urls={photos} />
            </>
          ) : (
            <p style={{ marginTop: 10, color: "#6b7280" }}>
              No photos added yet for {city.label}.
            </p>
          )}

          <section style={{ marginTop: 24 }}>
            <h3 style={{ margin: 0, marginBottom: 10 }}>Videos</h3>
            {sfVideos.length === 0 ? (
              <p style={{ color: "#6b7280" }}>No videos added yet.</p>
            ) : (
              <ul>
                {sfVideos.map((v) => (
                  <li key={v}>
                    <a href={v} target="_blank" rel="noreferrer">
                      {v}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </main>

        <aside className="hn-sidebar">
          <div className="hn-sidebar-box">
            <h3>Submit media</h3>
            <p style={{ margin: 0, color: "#6b7280", fontSize: 12 }}>
              Coming soon: upload links + tagged city.
            </p>
          </div>
        </aside>
      </div>
    </>
  );
}
