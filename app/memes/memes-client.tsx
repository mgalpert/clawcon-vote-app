"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../../lib/supabaseClient";
import { DEFAULT_CITY_KEY, getCity, withCity } from "../../lib/cities";

type ViewMode = "grid" | "list";

type MemeRow = {
  id: string;
  city: string;
  title: string | null;
  image_url: string;
  source_url: string | null;
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

export default function MemesClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const cityKey = searchParams.get("city") || DEFAULT_CITY_KEY;
  const city = getCity(cityKey);

  const [session, setSession] = useState<Session | null>(null);
  const userEmail = session?.user?.email ?? null;

  const [view, setView] = useState<ViewMode>("grid");
  const [memes, setMemes] = useState<MemeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);

  // form
  const [title, setTitle] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchMemes = useCallback(async () => {
    setLoading(true);
    setNotice(null);

    const { data, error } = await supabase
      .from("memes")
      .select("id,city,title,image_url,source_url,created_at")
      .eq("city", city.label)
      .order("created_at", { ascending: false });

    if (error) {
      setMemes([]);
      setNotice("Memes database not configured yet (missing `memes` table). ");
      setLoading(false);
      return;
    }

    setMemes((data as MemeRow[]) || []);
    setLoading(false);
  }, [city.label]);

  useEffect(() => {
    // view pref
    try {
      const stored = window.localStorage.getItem("clawcon.memes.view");
      if (stored === "list" || stored === "grid") setView(stored);
    } catch {}

    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, newSession) => setSession(newSession),
    );

    fetchMemes();

    return () => authListener.subscription.unsubscribe();
  }, [fetchMemes]);

  useEffect(() => {
    try {
      window.localStorage.setItem("clawcon.memes.view", view);
    } catch {}
  }, [view]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const canSubmit = Boolean(session);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setNotice(null);

    if (!session) {
      setNotice("Sign in to submit a meme.");
      return;
    }

    const img = safeUrl(imageUrl.trim());
    if (!img) {
      setNotice("Image URL must be a valid https URL.");
      return;
    }

    const src = sourceUrl.trim() ? safeUrl(sourceUrl.trim()) : null;
    if (sourceUrl.trim() && !src) {
      setNotice("Source URL must be a valid https URL (or leave it blank). ");
      return;
    }

    setSubmitting(true);

    const payload = {
      city: city.label,
      title: title.trim() || null,
      image_url: img,
      source_url: src,
    };

    const { error } = await supabase.from("memes").insert(payload);

    setSubmitting(false);

    if (error) {
      setNotice(error.message);
      return;
    }

    setTitle("");
    setImageUrl("");
    setSourceUrl("");
    setNotice("Submitted!");
    fetchMemes();
  };

  const items = useMemo(() => memes, [memes]);

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
            <a href={withCity("/livestream", city.key)} className="hn-nav-link">
              livestream
            </a>
            <span className="hn-nav-sep">|</span>
            <a href="/skills" className="hn-nav-link">
              skills
            </a>
            <span className="hn-nav-sep">|</span>
            <a
              href={withCity("/memes", city.key)}
              className="hn-nav-link active"
            >
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
            <h2 style={{ margin: 0 }}>Memes · {city.label}</h2>
            <span style={{ color: "#6b7280", fontSize: 12 }}>
              Post memes, inside jokes, screenshots, and cursed diagrams.
            </span>
          </div>

          <div style={{ margin: "10px 0 12px", display: "flex", gap: 8 }}>
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
            <p style={{ color: "#6b7280" }}>Loading…</p>
          ) : items.length === 0 ? (
            <p style={{ color: "#6b7280" }}>No memes yet for {city.label}.</p>
          ) : view === "list" ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {items.map((m) => (
                <div
                  key={m.id}
                  style={{
                    border: "1px solid #e5e7eb",
                    background: "#fff",
                    borderRadius: 12,
                    overflow: "hidden",
                  }}
                >
                  <a
                    href={m.image_url}
                    target="_blank"
                    rel="noreferrer"
                    style={{ display: "block" }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={m.image_url}
                      alt={m.title || "meme"}
                      loading="lazy"
                      style={{
                        width: "100%",
                        maxHeight: 420,
                        objectFit: "cover",
                      }}
                    />
                  </a>
                  <div style={{ padding: 12 }}>
                    <div style={{ fontWeight: 800 }}>
                      {m.title || "Untitled"}
                    </div>
                    <div style={{ color: "#6b7280", fontSize: 12 }}>
                      {m.source_url ? (
                        <a href={m.source_url} target="_blank" rel="noreferrer">
                          source
                        </a>
                      ) : null}
                      {m.source_url ? " · " : ""}
                      {new Date(m.created_at).toLocaleString()}
                    </div>
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
                marginTop: 12,
              }}
            >
              {items.map((m) => (
                <div
                  key={m.id}
                  style={{
                    border: "1px solid #e5e7eb",
                    borderRadius: 12,
                    padding: 10,
                    background: "#fff",
                  }}
                >
                  <a
                    href={m.image_url}
                    target="_blank"
                    rel="noreferrer"
                    style={{ display: "block" }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={m.image_url}
                      alt={m.title || "meme"}
                      loading="lazy"
                      style={{
                        width: "100%",
                        height: 220,
                        objectFit: "cover",
                        borderRadius: 8,
                        display: "block",
                      }}
                    />
                  </a>
                  <div style={{ marginTop: 8 }}>
                    <div style={{ fontWeight: 800, fontSize: 12 }}>
                      {m.title || "Untitled"}
                    </div>
                    <div
                      style={{ color: "#6b7280", fontSize: 11, marginTop: 2 }}
                    >
                      {m.source_url ? (
                        <a href={m.source_url} target="_blank" rel="noreferrer">
                          source
                        </a>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>

        <aside className="hn-sidebar">
          <div className="hn-sidebar-box">
            <h3>Submit a Meme</h3>
            {!canSubmit ? (
              <div className="hn-signin-prompt">
                <p>Sign in on the submissions page to post memes.</p>
                <Link href={withCity("/", city.key)} className="hn-button">
                  Sign in
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="hn-form">
                <label>
                  Title (optional)
                  <input
                    className="input"
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="When the RPC 404s"
                  />
                </label>
                <label>
                  Image URL (required)
                  <input
                    className="input"
                    type="text"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="https://..."
                    required
                  />
                </label>
                <label>
                  Source URL (optional)
                  <input
                    className="input"
                    type="text"
                    value={sourceUrl}
                    onChange={(e) => setSourceUrl(e.target.value)}
                    placeholder="https://..."
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

          <div className="hn-sidebar-box">
            <h4>💡 Meme ideas</h4>
            <ul className="hn-ideas">
              <li>
                Screenshot something weird on{" "}
                <a href={withCity("/molt", city.key)}>molt</a>
              </li>
              <li>
                Make a fake map for{" "}
                <a href={withCity("/youarehere", city.key)}>you are here</a>
              </li>
              <li>
                Post your agent’s final form from{" "}
                <a href={withCity("/evolution", city.key)}>evolution</a>
              </li>
            </ul>
            <p className="hn-tip">Keep it friendly. Punch up, not down.</p>
          </div>
        </aside>
      </div>

      <footer className="hn-footer">
        <a href="https://github.com/clawcon" target="_blank" rel="noreferrer">
          GitHub
        </a>
        {" | "}
        <span>
          Forked from{" "}
          <a href="https://x.com/msg" target="_blank" rel="noreferrer">
            @msg
          </a>{" "}
          by{" "}
          <a href="https://x.com/dablclub" target="_blank" rel="noreferrer">
            @colygon
          </a>
        </span>
        {" | "}
        <span>Orchestrated by Clawd</span>
      </footer>
    </>
  );
}
