"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../../lib/supabaseClient";
import { DEFAULT_CITY_KEY, getCity, withCity } from "../../lib/cities";

type ChatKind = "group" | "chatbot";

type PlatformKey =
  | "telegram"
  | "whatsapp"
  | "signal"
  | "discord"
  | "line"
  | "kakao"
  | "wechat";

type ChatRow = {
  id: string;
  created_at: string;
  city: string;
  kind: ChatKind;
  platform: PlatformKey;
  name: string;
  url: string;
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

const OFFICIAL_CHATS: Array<{
  platform: PlatformKey;
  kind: ChatKind;
  name: string;
  url: string;
  notes?: string;
}> = [
  {
    platform: "telegram",
    kind: "group",
    name: "Claw Con Telegram",
    url: "https://t.me/clawcon",
    notes: "Official community chat",
  },
  {
    platform: "discord",
    kind: "group",
    name: "Claw Con Discord",
    url: "https://discord.gg/hhSCBayj",
    notes: "Official community chat",
  },
];

export default function ChatsClient() {
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

  const [rows, setRows] = useState<ChatRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [formKind, setFormKind] = useState<ChatKind>("group");
  const [formPlatform, setFormPlatform] = useState<PlatformKey>("telegram");
  const [formName, setFormName] = useState("");
  const [formUrl, setFormUrl] = useState("");
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

  const fetchChats = useCallback(async () => {
    setLoading(true);
    setNotice(null);

    const { data, error } = await supabase
      .from("chats")
      .select("id,created_at,city,kind,platform,name,url,notes")
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) {
      setRows([]);
      setNotice("Unable to load chats right now.");
      setLoading(false);
      return;
    }

    setRows((data as ChatRow[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchChats();
  }, [fetchChats]);

  const officialForCity = useMemo(
    () => OFFICIAL_CHATS.map((c, idx) => ({ ...c, id: `official-${idx}` })),
    [],
  );

  const filtered = useMemo(() => {
    const cityLabel = city.label;
    return rows.filter((r) => r.city === cityLabel);
  }, [rows, city.label]);

  const combined = useMemo(() => {
    // Official chats always appear first.
    const official = officialForCity.map((c) => ({
      ...c,
      created_at: "",
      city: city.label,
      notes: c.notes ?? null,
    }));

    const dedup = filtered.filter(
      (r) => !official.some((o) => o.url === r.url),
    );

    return [...official, ...dedup];
  }, [officialForCity, filtered, city.label]);

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
            <a
              href={withCity("/chats", city.key)}
              className="hn-nav-link active"
            >
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
            <a
              href={withCity("/chats", city.key)}
              className="hn-nav-link active"
            >
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

      {notice && <div className="hn-notice">{notice}</div>}

      <div className="hn-city-rail" aria-label="City selector">
        <div className="hn-city-rail-label">Cities</div>
        <a
          className={city.key === "san-francisco" ? "active" : ""}
          href={withCity("/chats", "san-francisco")}
        >
          San Francisco
        </a>
        <a
          className={city.key === "denver" ? "active" : ""}
          href={withCity("/chats", "denver")}
        >
          Denver
        </a>
        <a
          className={city.key === "tokyo" ? "active" : ""}
          href={withCity("/chats", "tokyo")}
        >
          Tokyo
        </a>
        <a
          className={city.key === "kona" ? "active" : ""}
          href={withCity("/chats", "kona")}
        >
          Kona
        </a>
      </div>

      <div className="hn-layout">
        <main className="hn-main">
          <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
            <h2 style={{ margin: 0 }}>Chats · {city.label}</h2>
            <span style={{ color: "#6b7280", fontSize: 12 }}>
              Group chats + chatbots.
            </span>
          </div>

          {loading ? (
            <p style={{ color: "#6b7280", marginTop: 12 }}>Loading…</p>
          ) : combined.length === 0 ? (
            <p style={{ color: "#6b7280", marginTop: 12 }}>
              No chats yet for {city.label}.
            </p>
          ) : (
            <table className="hn-table" style={{ marginTop: 12 }}>
              <tbody>
                {combined.map((c, idx) => (
                  <tr
                    key={(c as any).id || `${c.url}-${idx}`}
                    className="hn-row"
                  >
                    <td className="hn-rank">{idx + 1}.</td>
                    <td className="hn-content">
                      <div className="hn-title-row">
                        <a
                          className="hn-title"
                          href={c.url}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {c.name}
                        </a>
                        <span className="hn-domain">
                          ({c.platform} · {c.kind})
                        </span>
                      </div>
                      {c.notes ? (
                        <div className="hn-meta">{c.notes}</div>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </main>

        <aside className="hn-sidebar">
          <div className="hn-sidebar-box">
            <h4>➕ Submit a chat</h4>

            {!session ? (
              <div className="hn-signin-prompt">
                <p>Sign in on the submissions page to add chats.</p>
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
                    setNotice("Chat URL must be a valid https URL.");
                    return;
                  }

                  if (!formName.trim()) {
                    setNotice("Name is required.");
                    return;
                  }

                  setSubmitting(true);
                  const { error } = await supabase.from("chats").insert({
                    city: city.label,
                    kind: formKind,
                    platform: formPlatform,
                    name: formName.trim(),
                    url: u,
                    notes: formNotes.trim() || null,
                  });
                  setSubmitting(false);

                  if (error) {
                    setNotice(error.message);
                    return;
                  }

                  setFormName("");
                  setFormUrl("");
                  setFormNotes("");
                  fetchChats();
                }}
              >
                <label>
                  Type
                  <select
                    className="input"
                    value={formKind}
                    onChange={(e) => setFormKind(e.target.value as ChatKind)}
                  >
                    <option value="group">group chat</option>
                    <option value="chatbot">chatbot</option>
                  </select>
                </label>

                <label>
                  Platform
                  <select
                    className="input"
                    value={formPlatform}
                    onChange={(e) =>
                      setFormPlatform(e.target.value as PlatformKey)
                    }
                  >
                    <option value="telegram">telegram</option>
                    <option value="discord">discord</option>
                    <option value="whatsapp">whatsapp</option>
                    <option value="signal">signal</option>
                    <option value="line">line</option>
                    <option value="kakao">kakao</option>
                    <option value="wechat">wechat</option>
                  </select>
                </label>

                <label>
                  Name
                  <input
                    className="input"
                    type="text"
                    placeholder="Claw Con SF Chat"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    required
                  />
                </label>

                <label>
                  URL
                  <input
                    className="input"
                    type="text"
                    placeholder="https://..."
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
                    placeholder="What is it for?"
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
                  Add a group chat link or a chatbot link.
                </p>
              </form>
            )}
          </div>

          <div className="hn-sidebar-box">
            <h4>✅ Tips</h4>
            <ul className="hn-ideas">
              <li>Use a permanent invite link if possible.</li>
              <li>Only submit chats you trust—these links will be public.</li>
            </ul>
          </div>
        </aside>
      </div>
    </>
  );
}
