"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../../lib/supabaseClient";
import { DEFAULT_CITY_KEY, getCity, withCity } from "../../lib/cities";
import CitySelect from "../city-select";
import MobileNav from "../mobile-nav";

type SponsorKind =
  | "in-kind"
  | "credits"
  | "awards"
  | "prizes"
  | "grants"
  | "challenges";

type SponsorRow = {
  id: string;
  created_at: string;
  city: string;
  name: string;
  url: string | null;
  kind: SponsorKind;
  contribution: string | null;
  notes: string | null;
  logo_url: string | null;
};

const OFFICIAL_SPONSORS: Array<{
  name: string;
  url: string;
  contribution: string;
  logo_url: string | null;
  kind: SponsorKind;
}> = [
  {
    name: "Frontier Tower",
    contribution: "Venue",
    logo_url: "/sponsors/frontiertower.png",
    url: "https://frontiertower.io",
    kind: "in-kind",
  },
  {
    name: "Amazon AGI Labs",
    contribution: "Project Sponsor",
    logo_url: "/sponsors/amazon.svg",
    url: "https://labs.amazon.science/",
    kind: "credits",
  },
  {
    name: "Bee",
    contribution: "Lobster Rolls",
    logo_url: "/sponsors/bee.svg",
    url: "https://www.bee.computer/",
    kind: "in-kind",
  },
  {
    name: "Convex",
    contribution: "Pizza",
    logo_url: "/sponsors/convex.svg",
    url: "https://convex.dev",
    kind: "in-kind",
  },
  {
    name: "CRS Credit API",
    contribution: "Mediterranean",
    logo_url: "/sponsors/crs.svg",
    url: "https://crscreditapi.com/",
    kind: "credits",
  },
  {
    name: "Kilo.ai",
    contribution: "Crab",
    logo_url: "/sponsors/kilo.svg",
    url: "https://kilo.ai",
    kind: "in-kind",
  },
  {
    name: "Greycroft",
    contribution: "Drinks & Snacks",
    logo_url: "/sponsors/greycroft.svg",
    url: "https://www.greycroft.com/",
    kind: "in-kind",
  },
  {
    name: "CodeRabbit",
    contribution: "Drinks & Snacks",
    logo_url: "/sponsors/coderabbit.svg",
    url: "https://www.coderabbit.ai/",
    kind: "in-kind",
  },
  {
    name: "Cua",
    contribution: "Drinks & Snacks",
    logo_url: "/sponsors/cua.svg",
    url: "https://cua.ai/",
    kind: "in-kind",
  },
  {
    name: "Cline",
    contribution: "Drinks & Utensils",
    logo_url: "/sponsors/cline.svg",
    url: "https://cline.bot/",
    kind: "in-kind",
  },
  {
    name: "Render",
    contribution: "Claws, Chips, Cola & Credits",
    logo_url: "/sponsors/render.svg",
    url: "https://render.com",
    kind: "credits",
  },
  {
    name: "ElevenLabs",
    contribution: "Drinks & Snacks",
    logo_url: "/sponsors/elevenlabs.svg",
    url: "https://elevenlabs.io/",
    kind: "in-kind",
  },
  {
    name: "DigitalOcean",
    contribution: "Drinks",
    logo_url: "/sponsors/digitalocean.svg",
    url: "https://www.digitalocean.com/",
    kind: "in-kind",
  },
  {
    name: "Rippling",
    contribution: "Lobster Plushies",
    logo_url: "/sponsors/rippling.svg",
    url: "https://www.rippling.com/",
    kind: "prizes",
  },
  {
    name: "Dabl Club",
    contribution: "Event Support",
    logo_url: "/sponsors/dabl.svg",
    url: "https://dabl.club",
    kind: "in-kind",
  },
  {
    name: "Love Haight Computers",
    contribution: "Mac Mini Giveaway",
    logo_url: null,
    url: "https://www.lovehaightcomputers.com/",
    kind: "prizes",
  },
];

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

export default function SponsorsClient() {
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

  const [rows, setRows] = useState<SponsorRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [formName, setFormName] = useState("");
  const [formUrl, setFormUrl] = useState("");
  const [formKind, setFormKind] = useState<SponsorKind>("in-kind");
  const [formContribution, setFormContribution] = useState("");
  const [formLogoUrl, setFormLogoUrl] = useState("");
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

  const fetchSponsors = useCallback(async () => {
    setLoading(true);
    setNotice(null);

    const { data, error } = await supabase
      .from("sponsors")
      .select("id,created_at,city,name,url,kind,contribution,notes,logo_url")
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) {
      setRows([]);
      setNotice(
        "Sponsors database not configured yet (missing `sponsors` table).",
      );
      setLoading(false);
      return;
    }

    setRows((data as SponsorRow[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchSponsors();
  }, [fetchSponsors]);

  const combined = useMemo(() => {
    const cityLabel = city.label;

    const official = OFFICIAL_SPONSORS.map((s, idx) => ({
      id: `official-${idx}`,
      created_at: "",
      city: cityLabel,
      name: s.name,
      url: s.url,
      kind: s.kind,
      contribution: s.contribution,
      notes: null,
      logo_url: s.logo_url,
    }));

    const submitted = rows.filter((r) => r.city === cityLabel);

    // De-dupe exact URL matches (so a submitted row doesn't duplicate official)
    const dedupSubmitted = submitted.filter(
      (r) => !r.url || !official.some((o) => o.url === r.url),
    );

    return [...official, ...dedupSubmitted];
  }, [rows, city.label]);

  return (
    <>
      <div className="hn-header">
        <div className="hn-header-left">
          <Link href={withCity("/", city.key)} className="hn-logo">
            <span className="hn-logo-icon">🦞</span>
            <span className="hn-logo-text">Claw Con</span>
          </Link>

          <CitySelect path="/sponsors" activeCityKey={city.key} />
          <MobileNav cityKey={city.key} activePath="/sponsors" />

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
            <a
              href={withCity("/sponsors", city.key)}
              className="hn-nav-link active"
            >
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

      {/* city selector moved to header */}

      <div className="hn-layout">
        <main className="hn-main">
          <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
            <h2 style={{ margin: 0 }}>Sponsors · {city.label}</h2>
            <span style={{ color: "#6b7280", fontSize: 12 }}>
              Thank you for supporting Claw Con.
            </span>
          </div>

          {loading ? (
            <p style={{ color: "#6b7280", marginTop: 12 }}>Loading…</p>
          ) : combined.length === 0 ? (
            <p style={{ color: "#6b7280", marginTop: 12 }}>
              No sponsors yet for {city.label}.
            </p>
          ) : (
            <table className="hn-table" style={{ marginTop: 12 }}>
              <tbody>
                {combined.map((s, idx) => (
                  <tr key={s.id} className="hn-row">
                    <td className="hn-rank">{idx + 1}.</td>
                    <td className="hn-content">
                      <div className="hn-title-row" style={{ gap: 10 }}>
                        {s.logo_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={s.logo_url}
                            alt={s.name}
                            style={{
                              width: 22,
                              height: 22,
                              objectFit: "contain",
                              borderRadius: 4,
                            }}
                          />
                        ) : null}
                        {s.url ? (
                          <a
                            className="hn-title"
                            href={s.url}
                            target="_blank"
                            rel="noreferrer"
                          >
                            {s.name}
                          </a>
                        ) : (
                          <span className="hn-title">{s.name}</span>
                        )}
                        <span className="hn-domain">({s.kind})</span>
                      </div>
                      <div className="hn-meta">
                        {s.contribution ? <span>{s.contribution}</span> : null}
                        {s.contribution && s.notes ? " · " : ""}
                        {s.notes ? <span>{s.notes}</span> : null}
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
            <h4>➕ Submit a sponsor</h4>

            {!session ? (
              <div className="hn-signin-prompt">
                <p>Sign in on the submissions page to add sponsors.</p>
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

                  if (!formName.trim()) {
                    setNotice("Sponsor name is required.");
                    return;
                  }

                  const u = safeUrl(formUrl.trim());
                  if (formUrl.trim() && !u) {
                    setNotice(
                      "Sponsor URL must be a valid https URL (or blank). ",
                    );
                    return;
                  }

                  const logo = safeUrl(formLogoUrl.trim());
                  if (formLogoUrl.trim() && !logo) {
                    setNotice(
                      "Logo URL must be a valid https URL (or blank). ",
                    );
                    return;
                  }

                  setSubmitting(true);
                  const { error } = await supabase.from("sponsors").insert({
                    city: city.label,
                    name: formName.trim(),
                    url: u,
                    kind: formKind,
                    contribution: formContribution.trim() || null,
                    notes: formNotes.trim() || null,
                    logo_url: logo,
                  });
                  setSubmitting(false);

                  if (error) {
                    setNotice(error.message);
                    return;
                  }

                  setFormName("");
                  setFormUrl("");
                  setFormContribution("");
                  setFormLogoUrl("");
                  setFormNotes("");
                  fetchSponsors();
                }}
              >
                <label>
                  Sponsor name
                  <input
                    className="input"
                    type="text"
                    placeholder="Acme Co"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    required
                  />
                </label>

                <label>
                  Sponsorship type
                  <select
                    className="input"
                    value={formKind}
                    onChange={(e) => setFormKind(e.target.value as SponsorKind)}
                  >
                    <option value="in-kind">in-kind</option>
                    <option value="credits">credits</option>
                    <option value="awards">awards</option>
                    <option value="prizes">prizes</option>
                    <option value="grants">grants</option>
                    <option value="challenges">challenges</option>
                  </select>
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
                  Contribution (optional)
                  <input
                    className="input"
                    type="text"
                    placeholder="What are you sponsoring?"
                    value={formContribution}
                    onChange={(e) => setFormContribution(e.target.value)}
                  />
                </label>

                <label>
                  Logo URL (optional)
                  <input
                    className="input"
                    type="text"
                    placeholder="https://.../logo.svg"
                    value={formLogoUrl}
                    onChange={(e) => setFormLogoUrl(e.target.value)}
                  />
                </label>

                <label>
                  Notes (optional)
                  <input
                    className="input"
                    type="text"
                    placeholder="Contact / details / constraints"
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
                  Sponsors can offer in-kind support, credits, or award tracks.
                </p>
              </form>
            )}
          </div>

          <div className="hn-sidebar-box">
            <h4>✅ Ideas</h4>
            <ul className="hn-ideas">
              <li>Prizes for hackathon winners</li>
              <li>Challenges for specific product themes</li>
              <li>Grants for open-source maintainer work</li>
              <li>In-kind: venue, food, drinks, hardware</li>
            </ul>
          </div>
        </aside>
      </div>
    </>
  );
}
