"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { Session } from "@supabase/supabase-js";
import CitySelect from "../city-select";
import MobileNav from "../mobile-nav";
import { supabase } from "../../lib/supabaseClient";
import { DEFAULT_CITY_KEY, getCity, withCity } from "../../lib/cities";

type RobotRow = {
  id: string;
  created_at: string;
  city: string;
  robot_name: string;
  maker_name: string;
  emergence_date: string; // date
};

export default function RobotsClient() {
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

  const [rows, setRows] = useState<RobotRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // form
  const [robotName, setRobotName] = useState("");
  const [makerName, setMakerName] = useState("");
  const [emergenceDate, setEmergenceDate] = useState("");

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

  const fetchRobots = useCallback(async () => {
    setLoading(true);
    setNotice(null);

    const { data, error } = await supabase
      .from("robots")
      .select("id,created_at,city,robot_name,maker_name,emergence_date")
      .order("created_at", { ascending: false })
      .limit(300);

    if (error) {
      setRows([]);
      setNotice("Robots database not configured yet (missing `robots` table).");
      setLoading(false);
      return;
    }

    setRows((data as RobotRow[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchRobots();
  }, [fetchRobots]);

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

          <CitySelect path="/robots" activeCityKey={city.key} />
          <MobileNav cityKey={city.key} activePath="/robots" />

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
            <a
              href={withCity("/robots", city.key)}
              className="hn-nav-link active"
            >
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
            <h2 style={{ margin: 0 }}>Robots · {city.label}</h2>
            <span style={{ color: "#6b7280", fontSize: 12 }}>
              Bring your weird little friend.
            </span>
          </div>

          {loading ? (
            <p style={{ color: "#6b7280", marginTop: 12 }}>Loading…</p>
          ) : filtered.length === 0 ? (
            <p style={{ color: "#6b7280", marginTop: 12 }}>
              No robots yet for {city.label}.
            </p>
          ) : (
            <table className="hn-table" style={{ marginTop: 12 }}>
              <tbody>
                {filtered.map((r, idx) => (
                  <tr key={r.id} className="hn-row">
                    <td className="hn-rank">{idx + 1}.</td>
                    <td className="hn-content">
                      <div className="hn-title-row">
                        <span className="hn-title">{r.robot_name}</span>
                        <span className="hn-domain">({r.maker_name})</span>
                      </div>
                      <div className="hn-meta">
                        <span>Emergence: {r.emergence_date}</span> ·{" "}
                        <span style={{ color: "#6b7280" }}>
                          submitted{" "}
                          {new Date(r.created_at).toLocaleDateString()}
                        </span>
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
            <h4>➕ Submit a robot</h4>

            {!session ? (
              <div className="hn-signin-prompt">
                <p>Sign in on the demos page to submit robots.</p>
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

                  if (!robotName.trim()) {
                    setNotice("Robot name is required.");
                    return;
                  }
                  if (!makerName.trim()) {
                    setNotice("Maker's name is required.");
                    return;
                  }
                  if (!emergenceDate) {
                    setNotice("Date of emergence is required.");
                    return;
                  }

                  setSubmitting(true);
                  const { error } = await supabase.from("robots").insert({
                    city: city.label,
                    robot_name: robotName.trim(),
                    maker_name: makerName.trim(),
                    emergence_date: emergenceDate,
                  });
                  setSubmitting(false);

                  if (error) {
                    setNotice(error.message);
                    return;
                  }

                  setRobotName("");
                  setMakerName("");
                  setEmergenceDate("");
                  fetchRobots();
                }}
              >
                <label>
                  Robot name
                  <input
                    className="input"
                    type="text"
                    placeholder="Clawtron 3000"
                    value={robotName}
                    onChange={(e) => setRobotName(e.target.value)}
                    required
                  />
                </label>

                <label>
                  Maker&apos;s name
                  <input
                    className="input"
                    type="text"
                    placeholder="Ada Lovelace"
                    value={makerName}
                    onChange={(e) => setMakerName(e.target.value)}
                    required
                  />
                </label>

                <label>
                  Date of emergence
                  <input
                    className="input"
                    type="date"
                    value={emergenceDate}
                    onChange={(e) => setEmergenceDate(e.target.value)}
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
                  Use the emergence date (not build date). Robots deserve lore.
                </p>
              </form>
            )}
          </div>
        </aside>
      </div>
    </>
  );
}
