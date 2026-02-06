"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabaseClient";
import type { Submission } from "../lib/types";
import { DEFAULT_CITY_KEY, getCity, withCity } from "../lib/cities";
import CitySelect from "./city-select";
import MobileNav from "./mobile-nav";
import { sanitizeLink, getDomain, timeAgo } from "../lib/utils";

export default function SubmissionBoard() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const cityKey = (searchParams.get("city") ||
    DEFAULT_CITY_KEY) as typeof DEFAULT_CITY_KEY;
  const city = getCity(cityKey);

  const [eventId, setEventId] = useState<string | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [session, setSession] = useState<Session | null>(null);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [cooldownEndsAt, setCooldownEndsAt] = useState<number | null>(null);
  const [cooldownNow, setCooldownNow] = useState<number>(Date.now());
  const [voteLoading, setVoteLoading] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formPresenter, setFormPresenter] = useState("");
  const [formLinks, setFormLinks] = useState("");

  // Social (for speaker profile)
  const [formWebsite, setFormWebsite] = useState("");
  const [formGithub, setFormGithub] = useState("");
  const [formX, setFormX] = useState("");
  const [formLinkedIn, setFormLinkedIn] = useState("");
  const [activeTab, setActiveTab] = useState<"speaker_demo" | "topic">(
    "speaker_demo",
  );
  const [showSignInModal, setShowSignInModal] = useState(false);
  const [displayCount, setDisplayCount] = useState(30);
  const [botKeyInfo, setBotKeyInfo] = useState<{
    last4: string;
    created_at: string;
    updated_at: string;
  } | null>(null);
  const [botKeyLoading, setBotKeyLoading] = useState(false);
  const [botKeyReveal, setBotKeyReveal] = useState<string | null>(null);
  const loaderRef = useRef<HTMLDivElement>(null);

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

  // Memoized derived state (needed before infinite scroll effect)
  const sortedSubmissions = useMemo(() => {
    return [...submissions].sort((a, b) => {
      const aHasGithub = a.links?.some((l) => l.includes("github.com")) ? 1 : 0;
      const bHasGithub = b.links?.some((l) => l.includes("github.com")) ? 1 : 0;
      if (bHasGithub !== aHasGithub) return bHasGithub - aHasGithub;
      return b.vote_count - a.vote_count;
    });
  }, [submissions]);

  const filteredSubmissions = useMemo(
    () =>
      sortedSubmissions.filter((item) => item.submission_type === activeTab),
    [sortedSubmissions, activeTab],
  );

  const visibleSubmissions = useMemo(
    () => filteredSubmissions.slice(0, displayCount),
    [filteredSubmissions, displayCount],
  );

  const hasMore = displayCount < filteredSubmissions.length;

  const fetchEvent = useCallback(async () => {
    // Event scoping is optional; if events table isn't set up yet, we still allow browsing.
    const { data, error } = await supabase
      .from("events")
      .select("id")
      .eq("slug", city.eventSlug)
      .maybeSingle();

    if (error) {
      // Don’t hard-fail the page if events aren’t deployed yet.
      setEventId(null);
      return;
    }

    setEventId(data?.id ?? null);
  }, [city.eventSlug]);

  const fetchSubmissions = useCallback(async () => {
    // Prefer the new event-scoped RPC. If the backend hasn't been migrated yet,
    // fall back to the legacy no-arg RPC.
    const scoped = await supabase.rpc("get_submissions_with_votes", {
      _event_slug: city.eventSlug,
    });

    if (!scoped.error) {
      setSubmissions((scoped.data as Submission[]) || []);
      return;
    }

    const legacy = await supabase.rpc("get_submissions_with_votes");
    if (legacy.error) {
      setNotice(
        "We're having trouble loading submissions. Please try again soon.",
      );
      return;
    }

    setSubmissions((legacy.data as Submission[]) || []);
  }, [city.eventSlug]);

  const fetchBotKeyInfo = useCallback(async () => {
    if (!session?.user?.id) {
      setBotKeyInfo(null);
      setBotKeyReveal(null);
      return;
    }

    const { data, error } = await supabase
      .from("bot_keys_public")
      .select("last4,created_at,updated_at")
      .maybeSingle();

    if (error) {
      setNotice("Unable to load bot key info. Please try again.");
      return;
    }

    setBotKeyInfo(data ?? null);
  }, [session]);

  useEffect(() => {
    let isMounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!isMounted) return;
      setSession(data.session);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        setSession(newSession);
        if (newSession) setShowSignInModal(false);
      },
    );

    fetchEvent();
    fetchSubmissions();

    return () => {
      isMounted = false;
      authListener.subscription.unsubscribe();
    };
  }, [fetchEvent, fetchSubmissions]);

  useEffect(() => {
    fetchBotKeyInfo();
  }, [fetchBotKeyInfo]);

  // Infinite scroll observer
  const loadMore = useCallback(() => {
    setDisplayCount((prev) => prev + 30);
  }, []);

  useEffect(() => {
    const current = loaderRef.current;
    if (!current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMore();
        }
      },
      { threshold: 0.1 },
    );

    observer.observe(current);

    return () => observer.disconnect();
  }, [loadMore, hasMore]);

  // Sign-in cooldown ticker (for resend UX)
  useEffect(() => {
    if (!cooldownEndsAt) return;
    const t = setInterval(() => setCooldownNow(Date.now()), 250);
    return () => clearInterval(t);
  }, [cooldownEndsAt]);

  const isBlockedEmail = (addr: string) =>
    addr.toLowerCase().endsWith("@agentmail.to");

  const handleMagicLink = async (event: React.FormEvent) => {
    event.preventDefault();
    setNotice(null);

    if (cooldownEndsAt && Date.now() < cooldownEndsAt) {
      const secs = Math.ceil((cooldownEndsAt - Date.now()) / 1000);
      setNotice(`Please wait ${secs}s before requesting another magic link.`);
      return;
    }

    if (isBlockedEmail(email)) {
      setNotice("Please use a real email address (agentmail.to is blocked).");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: process.env.NEXT_PUBLIC_SITE_URL || undefined,
      },
    });
    setLoading(false);

    if (error) {
      setNotice(error.message);
      return;
    }

    // 60s cooldown to prevent accidental spamming + provider rate limits
    setCooldownEndsAt(Date.now() + 60_000);
    setNotice(
      "Magic link sent — check your email (and spam). You can resend in 60s.",
    );
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const handleVote = async (submissionId: string) => {
    if (!session) {
      setShowSignInModal(true);
      return;
    }

    setNotice(null);
    setVoteLoading(submissionId);

    const { error } = await supabase
      .from("votes")
      .insert({ submission_id: submissionId });

    setVoteLoading(null);

    if (error) {
      // unique constraint violation => already voted
      // Postgres unique violation code: 23505
      // (supabase-js exposes it as `code`)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const code = (error as any).code;
      if (code === "23505") {
        setNotice("You already voted on that.");
        return;
      }

      setNotice(error.message);
      return;
    }

    fetchSubmissions();
  };

  const handleSubmission = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!session) {
      setShowSignInModal(true);
      return;
    }

    setNotice(null);
    setSubmitLoading(true);

    const links = [
      ...formLinks
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      formWebsite.trim(),
      formGithub.trim(),
      formX.trim(),
      formLinkedIn.trim(),
    ]
      .filter(Boolean)
      .map((l) => sanitizeLink(l))
      .filter((l): l is string => Boolean(l))
      .filter((l, i, a) => a.indexOf(l) === i);

    if (!eventId) {
      setSubmitLoading(false);
      setNotice(
        `This event isn't configured yet for ${city.label}. (Missing event in DB: ${city.eventSlug})`,
      );
      return;
    }

    const payload = {
      event_id: eventId,
      title: formTitle.trim(),
      description: formDescription.trim(),
      presenter_name: formPresenter.trim() || "Anonymous",
      links: links.length ? links : null,
      submission_type: activeTab,
      submitted_by: "human" as const,
    };

    const { error } = await supabase.from("submissions").insert(payload);

    setSubmitLoading(false);

    if (error) {
      setNotice(error.message);
      return;
    }

    setFormTitle("");
    setFormDescription("");
    setFormPresenter("");
    setFormLinks("");
    setFormWebsite("");
    setFormGithub("");
    setFormX("");
    setFormLinkedIn("");

    setNotice("Submitted!");
    fetchSubmissions();
  };

  const handleBotKeyReveal = async () => {
    if (!session) {
      setShowSignInModal(true);
      return;
    }
    setNotice(null);
    setBotKeyLoading(true);
    const response = await fetch("/api/bot-key/reveal", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
    });
    const data = await response.json();
    setBotKeyLoading(false);
    if (!response.ok) {
      setNotice(data.error || "Unable to reveal bot key.");
      return;
    }
    setBotKeyReveal(data.api_key);
    setNotice("Bot key revealed. Copy it now.");
  };

  const handleBotKeyRegenerate = async () => {
    if (!session) {
      setShowSignInModal(true);
      return;
    }
    setNotice(null);
    setBotKeyLoading(true);
    const response = await fetch("/api/bot-key/regenerate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
    });
    const data = await response.json();
    setBotKeyLoading(false);
    if (!response.ok) {
      setNotice(data.error || "Unable to regenerate bot key.");
      return;
    }
    setBotKeyReveal(data.api_key);
    setNotice(data.warning || "Bot key regenerated. Copy it now.");
    fetchBotKeyInfo();
  };
  return (
    <>
      {/* Sign-in Modal */}
      {showSignInModal && (
        <div
          className="modal-overlay"
          onClick={() => setShowSignInModal(false)}
        >
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <button
              className="modal-close"
              onClick={() => setShowSignInModal(false)}
            >
              ×
            </button>
            <h2>Sign in to vote</h2>
            <p>We'll email you a one-click magic link. No password needed.</p>
            <form onSubmit={handleMagicLink} className="modal-form">
              <input
                className="input"
                type="email"
                placeholder="you@email.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                autoFocus
              />
              <button
                className="hn-button"
                type="submit"
                disabled={
                  loading ||
                  (cooldownEndsAt !== null && cooldownNow < cooldownEndsAt)
                }
              >
                {loading
                  ? "Sending..."
                  : cooldownEndsAt !== null && cooldownNow < cooldownEndsAt
                    ? `Resend in ${Math.ceil((cooldownEndsAt - cooldownNow) / 1000)}s`
                    : "Send magic link"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Header with sidebar layout */}
      <div className="hn-header">
        <div className="hn-header-left">
          <div className="hn-logo">
            <span className="hn-logo-icon">🦞</span>
            <span className="hn-logo-text">Claw Con</span>
          </div>

          <CitySelect path="/" activeCityKey={city.key} />
          <MobileNav cityKey={city.key} activePath="/" />

          <nav className="hn-nav">
            <button
              className={`hn-nav-link ${activeTab === "speaker_demo" ? "active" : ""}`}
              onClick={() => {
                setActiveTab("speaker_demo");
                setDisplayCount(30);
              }}
            >
              projects
            </button>
            <span className="hn-nav-sep">|</span>
            <button
              className={`hn-nav-link ${activeTab === "topic" ? "active" : ""}`}
              onClick={() => {
                setActiveTab("topic");
                setDisplayCount(30);
              }}
            >
              topics
            </button>
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
        {/* Main content - submissions list */}
        <main className="hn-main">
          <table className="hn-table">
            <tbody>
              {visibleSubmissions.length === 0 ? (
                <tr>
                  <td colSpan={3} className="hn-empty">
                    No submissions yet — be the first!
                  </td>
                </tr>
              ) : (
                visibleSubmissions.map((submission, index) => {
                  const primaryLink = submission.links?.[0];
                  const domain = primaryLink ? getDomain(primaryLink) : null;

                  return (
                    <tr key={submission.id} className="hn-row">
                      <td className="hn-rank">{index + 1}.</td>
                      <td className="hn-vote">
                        <button
                          className="hn-upvote"
                          onClick={() => handleVote(submission.id)}
                          disabled={voteLoading === submission.id}
                          title="upvote"
                        >
                          ▲
                        </button>
                      </td>
                      <td className="hn-content">
                        <div className="hn-title-row">
                          <Link
                            href={`/post/${submission.id}`}
                            className="hn-title"
                          >
                            {submission.title}
                          </Link>
                          {domain && (
                            <span className="hn-domain">({domain})</span>
                          )}
                          {submission.is_openclaw_contributor && (
                            <span
                              className="hn-badge contributor"
                              title="OpenClaw Contributor"
                            >
                              🦞
                            </span>
                          )}
                          {submission.links?.some((l) =>
                            l.includes("github.com"),
                          ) && (
                            <span className="hn-badge oss" title="Open Source">
                              ⭐
                            </span>
                          )}
                        </div>
                        <div className="hn-meta">
                          <span className="hn-points">
                            {submission.vote_count} point
                            {submission.vote_count !== 1 ? "s" : ""}
                          </span>
                          {" by "}
                          <span className="hn-presenter">
                            {submission.presenter_name}
                          </span>
                          {submission.created_at && (
                            <>
                              {" "}
                              <span className="hn-time">
                                {timeAgo(submission.created_at)}
                              </span>
                            </>
                          )}
                          {" | "}
                          <Link
                            href={`/post/${submission.id}`}
                            className="hn-link"
                          >
                            {submission.comment_count || 0} comment
                            {(submission.comment_count || 0) === 1 ? "" : "s"}
                          </Link>
                          {submission.links && submission.links.length > 1 && (
                            <>
                              {" | "}
                              <span className="hn-links-count">
                                {submission.links.length} links
                              </span>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>

          {/* Infinite scroll trigger */}
          {hasMore && (
            <div ref={loaderRef} className="hn-loader">
              Loading more...
            </div>
          )}

          {!hasMore && filteredSubmissions.length > 0 && (
            <div className="hn-end">
              — {filteredSubmissions.length} submissions —
            </div>
          )}
        </main>

        {/* Sidebar - submit form */}
        <aside className="hn-sidebar">
          <div className="hn-sidebar-box">
            <h3>Submit a {activeTab === "speaker_demo" ? "Demo" : "Topic"}</h3>
            {session ? (
              <form onSubmit={handleSubmission} className="hn-form">
                <label>
                  Title
                  <input
                    className="input"
                    type="text"
                    placeholder={
                      activeTab === "speaker_demo"
                        ? "Your demo name"
                        : "Topic title"
                    }
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    required
                  />
                </label>
                <label>
                  Description
                  <textarea
                    className="input"
                    placeholder="What will attendees learn? 1–3 sentences."
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    required
                    rows={3}
                  />
                </label>
                <label>
                  {activeTab === "speaker_demo"
                    ? "Presenter"
                    : "Lead (optional)"}
                  <input
                    className="input"
                    type="text"
                    placeholder="Your name"
                    value={formPresenter}
                    onChange={(e) => setFormPresenter(e.target.value)}
                    required={activeTab === "speaker_demo"}
                  />
                </label>
                <label>
                  Project links{" "}
                  {activeTab === "speaker_demo" ? "(required)" : "(optional)"}
                  <input
                    className="input"
                    type="text"
                    placeholder="https://github.com/... , https://..."
                    value={formLinks}
                    onChange={(e) => setFormLinks(e.target.value)}
                    required={activeTab === "speaker_demo"}
                  />
                </label>

                <details>
                  <summary style={{ cursor: "pointer", color: "#6b7280" }}>
                    Social links (for your profile)
                  </summary>
                  <div className="hn-form" style={{ marginTop: 10 }}>
                    <label>
                      Website (optional)
                      <input
                        className="input"
                        type="text"
                        placeholder="https://your-site.com"
                        value={formWebsite}
                        onChange={(e) => setFormWebsite(e.target.value)}
                      />
                    </label>
                    <label>
                      GitHub (optional)
                      <input
                        className="input"
                        type="text"
                        placeholder="https://github.com/yourhandle"
                        value={formGithub}
                        onChange={(e) => setFormGithub(e.target.value)}
                      />
                    </label>
                    <label>
                      X (optional)
                      <input
                        className="input"
                        type="text"
                        placeholder="https://x.com/yourhandle"
                        value={formX}
                        onChange={(e) => setFormX(e.target.value)}
                      />
                    </label>
                    <label>
                      LinkedIn (optional)
                      <input
                        className="input"
                        type="text"
                        placeholder="https://www.linkedin.com/in/you"
                        value={formLinkedIn}
                        onChange={(e) => setFormLinkedIn(e.target.value)}
                      />
                    </label>
                    <p className="hn-tip" style={{ margin: 0 }}>
                      Must be full <code>https://</code> URLs.
                    </p>
                  </div>
                </details>
                <button
                  className="hn-button"
                  type="submit"
                  disabled={submitLoading}
                >
                  {submitLoading ? "Submitting..." : "Submit"}
                </button>
              </form>
            ) : (
              <div className="hn-signin-prompt">
                <p>Sign in to submit a session.</p>
                <button
                  className="hn-button"
                  onClick={() => setShowSignInModal(true)}
                >
                  Sign in
                </button>
              </div>
            )}
          </div>

          <div className="hn-sidebar-box">
            <h4>
              {activeTab === "speaker_demo"
                ? "🎬 Demo ideas"
                : "💡 Topic ideas"}
            </h4>
            {activeTab === "speaker_demo" ? (
              <ul className="hn-ideas">
                <li>Multi-agent workflows</li>
                <li>Safe tool gating</li>
                <li>Vector memory</li>
                <li>Eval harness</li>
                <li>Skill routers</li>
              </ul>
            ) : (
              <ul className="hn-ideas">
                <li>Agent security</li>
                <li>Skill routing</li>
                <li>Memory design</li>
                <li>Orchestration patterns</li>
                <li>Evaluation frameworks</li>
                <li>Observability</li>
              </ul>
            )}
            <p className="hn-tip">
              {activeTab === "speaker_demo" ? (
                <>
                  Open source projects get priority! 🌟
                  <br />
                  OpenClaw contributors get +1000 points 🦞
                </>
              ) : (
                "Lead a discussion on any of these or propose your own."
              )}
            </p>
          </div>

          <details className="hn-sidebar-box hn-api-box">
            <summary>
              <strong>🤖 Bot API</strong>
            </summary>
            <div className="hn-api-content">
              <h4>🔑 Bot key</h4>
              <p>
                Keys are tied to your account and stored encrypted. Reveal or
                regenerate when needed.
              </p>
              {!session ? (
                <div className="hn-signin-prompt">
                  <p>Sign in to manage your bot key.</p>
                  <button
                    className="hn-button small"
                    onClick={() => setShowSignInModal(true)}
                  >
                    Sign in
                  </button>
                </div>
              ) : (
                <div className="hn-form">
                  {botKeyInfo ? (
                    <p>
                      Current key ends in <strong>{botKeyInfo.last4}</strong>.
                    </p>
                  ) : (
                    <p>No bot key yet.</p>
                  )}
                  <div
                    style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}
                  >
                    <button
                      className="hn-button small"
                      type="button"
                      onClick={handleBotKeyReveal}
                      disabled={botKeyLoading || !botKeyInfo}
                    >
                      Reveal
                    </button>
                    <button
                      className="hn-button small"
                      type="button"
                      onClick={handleBotKeyRegenerate}
                      disabled={botKeyLoading}
                    >
                      {botKeyInfo ? "Regenerate" : "Generate"}
                    </button>
                  </div>
                  {botKeyReveal && (
                    <p>
                      Bot key: <code>{botKeyReveal}</code>
                    </p>
                  )}
                </div>
              )}

              <h4 style={{ marginTop: "16px" }}>📡 Submit via API</h4>
              <p>
                POST JSON to <code>/api/webhook</code> with your bot key:
              </p>
              <pre className="hn-code">{`POST /api/webhook
Content-Type: application/json
x-api-key: <BOT_KEY>

{
  "title": "Demo Name",
  "description": "What it does",
  "presenter_name": "Your Name",
  "submission_type": "speaker_demo",
  "submitted_by": "bot_on_behalf",
  "submitted_for_name": "Name",
  "submitted_for_contact": "email",
  "links": ["https://github.com/..."]
}`}</pre>
              <p style={{ marginTop: "8px" }}>
                <code>submission_type</code>: <code>speaker_demo</code> or{" "}
                <code>topic</code>
              </p>
              <button
                className="hn-button small"
                style={{ marginTop: "12px", width: "100%" }}
                onClick={() => {
                  const agentPrompt = `# Claw Con Submission API

Submit a demo or topic to Claw Con (clawdcon.com) via API.

## Endpoint
POST https://clawdcon.com/api/webhook

## Headers
- Content-Type: application/json
- x-api-key: <YOUR_BOT_KEY>

## Request Body
{
  "title": "Your Demo/Topic Name",
  "description": "1-3 sentences explaining what attendees will learn",
  "presenter_name": "Your Name",
  "submission_type": "speaker_demo",  // or "topic"
  "submitted_by": "bot_on_behalf",
  "submitted_for_name": "Person's Name",
  "submitted_for_contact": "email@example.com",
  "links": ["https://github.com/your/repo"]
}

## Notes
- submission_type: "speaker_demo" (for projects) or "topic" (for discussion topics)
- submitted_by: use "bot_on_behalf" when submitting for someone else
- links: array of https URLs`;
                  navigator.clipboard.writeText(agentPrompt);
                  setNotice("Agent prompt copied to clipboard! 📋");
                }}
              >
                📋 Copy Agent Prompt
              </button>
            </div>
          </details>
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
