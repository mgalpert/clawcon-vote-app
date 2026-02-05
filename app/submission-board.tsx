"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabaseClient";
import type { Submission } from "../lib/types";
import { sanitizeLink, getDomain, timeAgo } from "../lib/utils";

export default function SubmissionBoard() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [session, setSession] = useState<Session | null>(null);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [voteLoading, setVoteLoading] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formPresenter, setFormPresenter] = useState("");
  const [formLinks, setFormLinks] = useState("");
  const [activeTab, setActiveTab] = useState<"speaker_demo" | "topic">("speaker_demo");
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
    () => sortedSubmissions.filter((item) => item.submission_type === activeTab),
    [sortedSubmissions, activeTab]
  );

  const visibleSubmissions = useMemo(
    () => filteredSubmissions.slice(0, displayCount),
    [filteredSubmissions, displayCount]
  );

  const hasMore = displayCount < filteredSubmissions.length;

  const fetchSubmissions = async () => {
    const { data, error } = await supabase.rpc("get_submissions_with_votes");
    if (error) {
      setNotice("We're having trouble loading submissions. Please try again soon.");
      return;
    }
    setSubmissions(data || []);
  };

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
      }
    );

    fetchSubmissions();

    return () => {
      isMounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

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
      { threshold: 0.1 }
    );

    observer.observe(current);

    return () => observer.disconnect();
  }, [loadMore, hasMore]);

  const isBlockedEmail = (addr: string) => addr.toLowerCase().endsWith("@agentmail.to");

  const handleMagicLink = async (event: React.FormEvent) => {
    event.preventDefault();
    setNotice("Sign-up is currently disabled. Thanks for attending ClawdCon! 🦞");
    return;
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const handleVote = async (_submissionId: string) => {
    setNotice("Voting is currently disabled. Thanks for attending ClawdCon! 🦞");
    return;
  };

  const handleSubmission = async (event: React.FormEvent) => {
    event.preventDefault();
    setNotice("Submissions are currently disabled. Thanks for attending ClawdCon! 🦞");
    return;
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
        Authorization: `Bearer ${session.access_token}`
      }
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
        Authorization: `Bearer ${session.access_token}`
      }
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
        <div className="modal-overlay" onClick={() => setShowSignInModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowSignInModal(false)}>×</button>
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
              <button className="hn-button" type="submit" disabled={loading}>
                {loading ? "Sending..." : "Send magic link"}
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
            <span className="hn-logo-text">ClawdCon</span>
          </div>
          <nav className="hn-nav">
            <button
              className={`hn-nav-link ${activeTab === "speaker_demo" ? "active" : ""}`}
              onClick={() => { setActiveTab("speaker_demo"); setDisplayCount(30); }}
            >
              demos
            </button>
            <span className="hn-nav-sep">|</span>
            <button
              className={`hn-nav-link ${activeTab === "topic" ? "active" : ""}`}
              onClick={() => { setActiveTab("topic"); setDisplayCount(30); }}
            >
              topics
            </button>
            <span className="hn-nav-sep">|</span>
            <a href="https://lu.ma/moltbot-sf-show-tell" target="_blank" rel="noreferrer" className="hn-nav-link">
              event page
            </a>
            <span className="hn-nav-sep">|</span>
            <a href="/sponsors" className="hn-nav-link">
              sponsors
            </a>
            <span className="hn-nav-sep">|</span>
            <a href="/molt" className="hn-nav-link">
              molt
            </a>
            <span className="hn-nav-sep">|</span>
            <a href="/youarehere" className="hn-nav-link">
              you are here
            </a>
            <span className="hn-nav-sep">|</span>
            <a href="/evolution" className="hn-nav-link">
              evolution
            </a>
            <span className="hn-nav-sep">|</span>
            <a href="https://t.me/clawcon" target="_blank" rel="noreferrer" className="hn-nav-link">
              join telegram
            </a>
            <span className="hn-nav-sep">|</span>
            <a href="https://discord.gg/hhSCBayj" target="_blank" rel="noreferrer" className="hn-nav-link">
              openclaw discord
            </a>
          </nav>
          {userEmail && (
            <div className="hn-user">
              <span>{userEmail}</span>
              <button className="hn-link" onClick={handleSignOut}>logout</button>
            </div>
          )}
        </div>
      </div>

      {notice && <div className="hn-notice">{notice}</div>}

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
                          <Link href={`/post/${submission.id}`} className="hn-title">
                            {submission.title}
                          </Link>
                          {domain && (
                            <span className="hn-domain">({domain})</span>
                          )}
                          {submission.is_openclaw_contributor && (
                            <span className="hn-badge contributor" title="OpenClawdContributor">🦞</span>
                          )}
                          {submission.links?.some((l) => l.includes("github.com")) && (
                            <span className="hn-badge oss" title="Open Source">⭐</span>
                          )}
                        </div>
                        <div className="hn-meta">
                          <span className="hn-points">{submission.vote_count} point{submission.vote_count !== 1 ? "s" : ""}</span>
                          {" by "}
                          <span className="hn-presenter">{submission.presenter_name}</span>
                          {submission.created_at && (
                            <>
                              {" "}
                              <span className="hn-time">{timeAgo(submission.created_at)}</span>
                            </>
                          )}
                          {" | "}
                          <Link href={`/post/${submission.id}`} className="hn-link">
                            {submission.comment_count || 0} comment{(submission.comment_count || 0) === 1 ? "" : "s"}
                          </Link>
                          {submission.links && submission.links.length > 1 && (
                            <>
                              {" | "}
                              <span className="hn-links-count">{submission.links.length} links</span>
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
                    placeholder={activeTab === "speaker_demo" ? "Your demo name" : "Topic title"}
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
                  {activeTab === "speaker_demo" ? "Presenter" : "Lead (optional)"}
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
                  Links {activeTab === "speaker_demo" ? "(required)" : "(optional)"}
                  <input
                    className="input"
                    type="text"
                    placeholder="https://github.com/..."
                    value={formLinks}
                    onChange={(e) => setFormLinks(e.target.value)}
                    required={activeTab === "speaker_demo"}
                  />
                </label>
                <button className="hn-button" type="submit" disabled={submitLoading}>
                  {submitLoading ? "Submitting..." : "Submit"}
                </button>
              </form>
            ) : (
              <div className="hn-signin-prompt">
                <p>Sign in to submit a session.</p>
                <button className="hn-button" onClick={() => setShowSignInModal(true)}>
                  Sign in
                </button>
              </div>
            )}
          </div>

          <div className="hn-sidebar-box">
            <h4>
              {activeTab === "speaker_demo" ? "🎬 Demo ideas" : "💡 Topic ideas"}
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
              {activeTab === "speaker_demo"
                ? <>Open source projects get priority! 🌟<br />OpenClaw contributors get +1000 points 🦞</>
                : "Lead a discussion on any of these or propose your own."}
            </p>
          </div>

          <details className="hn-sidebar-box hn-api-box">
            <summary><strong>🤖 Bot API</strong></summary>
            <div className="hn-api-content">
              <h4>🔑 Bot key</h4>
              <p>Keys are tied to your account and stored encrypted. Reveal or regenerate when needed.</p>
              {!session ? (
                <div className="hn-signin-prompt">
                  <p>Sign in to manage your bot key.</p>
                  <button className="hn-button small" onClick={() => setShowSignInModal(true)}>
                    Sign in
                  </button>
                </div>
              ) : (
                <div className="hn-form">
                  {botKeyInfo ? (
                    <p>Current key ends in <strong>{botKeyInfo.last4}</strong>.</p>
                  ) : (
                    <p>No bot key yet.</p>
                  )}
                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
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

              <h4 style={{marginTop: "16px"}}>📡 Submit via API</h4>
              <p>POST JSON to <code>/api/webhook</code> with your bot key:</p>
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
              <p style={{marginTop: "8px"}}><code>submission_type</code>: <code>speaker_demo</code> or <code>topic</code></p>
              <button
                className="hn-button small"
                style={{marginTop: "12px", width: "100%"}}
                onClick={() => {
                  const agentPrompt = `# ClawdCon Submission API

Submit a demo or topic to ClawdCon (clawdcon.com) via API.

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
- submission_type: "speaker_demo" (for demos) or "topic" (for discussion topics)
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
        <a href="https://github.com/mgalpert/clawcon-vote-app" target="_blank" rel="noreferrer">Source</a>
        {" | "}
        <span>Orchestrated by Clawd</span>
        {" | "}
        <span>Tokens and gentle nudges by <a href="https://x.com/msg" target="_blank" rel="noreferrer">@msg</a></span>
      </footer>
    </>
  );
}
