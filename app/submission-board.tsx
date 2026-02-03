"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabaseClient";

function sanitizeLink(link: string): string | null {
  try {
    const url = new URL(link);
    if (url.protocol !== "https:") return null;
    if (url.username || url.password) return null;
    return url.toString();
  } catch {
    return null;
  }
}

function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function timeAgo(date: string): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

interface Submission {
  id: string;
  title: string;
  description: string;
  presenter_name: string;
  links: string[] | null;
  vote_count: number;
  submission_type: "speaker_demo" | "topic";
  submitted_by: "human" | "bot" | "bot_on_behalf";
  submitted_for_name: string | null;
  is_openclaw_contributor: boolean;
  created_at?: string;
}

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
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const loaderRef = useRef<HTMLDivElement>(null);

  const userEmail = session?.user?.email ?? null;

  const fetchSubmissions = async () => {
    const { data, error } = await supabase.rpc("get_submissions_with_votes");
    if (error) {
      setNotice("We're having trouble loading submissions. Please try again soon.");
      return;
    }
    setSubmissions(data || []);
  };

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

  // Infinite scroll observer
  const loadMore = useCallback(() => {
    setDisplayCount((prev) => prev + 30);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );

    if (loaderRef.current) {
      observer.observe(loaderRef.current);
    }

    return () => observer.disconnect();
  }, [loadMore]);

  const handleMagicLink = async (event: React.FormEvent) => {
    event.preventDefault();
    setNotice(null);
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
      }
    });
    setLoading(false);
    if (error) {
      setNotice(error.message);
      return;
    }
    setNotice("Check your inbox for your sign-in link ✨");
    setShowSignInModal(false);
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
    const { error } = await supabase.from("votes").insert({
      submission_id: submissionId
    });
    setVoteLoading(null);
    if (error) {
      if (error.code === "23505") {
        setNotice("You've already voted for this one.");
      } else {
        setNotice(error.message);
      }
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
    const rawLinks = formLinks
      .split(",")
      .map((link) => link.trim())
      .filter(Boolean);
    const links = rawLinks.map((l) => sanitizeLink(l)).filter((l): l is string => l !== null);

    if (rawLinks.length > 0 && links.length === 0) {
      setNotice("Links must be valid https:// URLs");
      setSubmitLoading(false);
      return;
    }

    const presenterValue = formPresenter || (activeTab === "topic" ? "Community" : "");

    const { error } = await supabase.from("submissions").insert({
      title: formTitle,
      description: formDescription,
      presenter_name: presenterValue,
      links: links.length > 0 ? links : null,
      submission_type: activeTab,
      submitted_by: "human"
    });

    setSubmitLoading(false);
    if (error) {
      setNotice(error.message);
      return;
    }

    setFormTitle("");
    setFormDescription("");
    setFormPresenter("");
    setFormLinks("");
    setNotice("Submission received! 🎉");
    fetchSubmissions();
  };

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
            <span className="hn-logo-text">Claw Con</span>
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
              register
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
                  const isExpanded = expandedId === submission.id;

                  return (
                    <>
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
                            {primaryLink ? (
                              <a href={primaryLink} target="_blank" rel="noreferrer" className="hn-title">
                                {submission.title}
                              </a>
                            ) : (
                              <span className="hn-title">{submission.title}</span>
                            )}
                            {domain && (
                              <span className="hn-domain">({domain})</span>
                            )}
                            {submission.is_openclaw_contributor && (
                              <span className="hn-badge contributor" title="OpenClaw Contributor">🦞</span>
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
                            <button
                              className="hn-link"
                              onClick={() => setExpandedId(isExpanded ? null : submission.id)}
                            >
                              {isExpanded ? "hide" : "details"}
                            </button>
                            {submission.links && submission.links.length > 1 && (
                              <>
                                {" | "}
                                <span className="hn-links-count">{submission.links.length} links</span>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr key={`${submission.id}-expanded`} className="hn-expanded-row">
                          <td></td>
                          <td></td>
                          <td className="hn-expanded-content">
                            <p className="hn-description">{submission.description}</p>
                            {submission.links && submission.links.length > 0 && (
                              <div className="hn-links-list">
                                {submission.links.map((link) => (
                                  <a key={link} href={link} target="_blank" rel="noreferrer" className="hn-link-item">
                                    {link.replace(/^https?:\/\//, "")}
                                  </a>
                                ))}
                              </div>
                            )}
                            <p className="hn-submitted-by">
                              {submission.submitted_by === "bot_on_behalf"
                                ? `Submitted by bot on behalf of ${submission.submitted_for_name || "someone"}`
                                : `Submitted by ${submission.submitted_by}`}
                            </p>
                          </td>
                        </tr>
                      )}
                    </>
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
                ? "Open source projects get priority! 🌟"
                : "Lead a discussion on any of these or propose your own."}
            </p>
          </div>

          <details className="hn-sidebar-box hn-api-box">
            <summary><strong>🤖 Bot API</strong></summary>
            <div className="hn-api-content">
              <p>POST to <code>/api/webhook</code> with your bot key.</p>
              <form
                onSubmit={async (event) => {
                  event.preventDefault();
                  const form = new FormData(event.currentTarget);
                  const emailValue = String(form.get("bot_email") || "").trim();
                  if (!emailValue) return;
                  setNotice(null);
                  const response = await fetch("/api/bot-key", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email: emailValue })
                  });
                  const data = await response.json();
                  if (!response.ok) {
                    setNotice(data.error || "Unable to issue bot key.");
                    return;
                  }
                  setNotice(`Bot key: ${data.api_key}`);
                }}
                className="hn-form"
              >
                <input className="input" type="email" name="bot_email" placeholder="your@email.com" required />
                <button className="hn-button small" type="submit">Get key</button>
              </form>
            </div>
          </details>
        </aside>
      </div>

      <footer className="hn-footer">
        <a href="https://github.com/mgalpert/clawcon-vote-app" target="_blank" rel="noreferrer">Source</a>
        {" | "}
        <span>Orchestrated by Clawd</span>
        {" | "}
        <span>Tokens by <a href="https://x.com/msg" target="_blank" rel="noreferrer">@msg</a></span>
      </footer>
    </>
  );
}
