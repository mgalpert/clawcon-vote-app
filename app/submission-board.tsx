"use client";

import { useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabaseClient";

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
    const links = formLinks
      .split(",")
      .map((link) => link.trim())
      .filter(Boolean);

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

  return (
    <>
      {/* Sign-in Modal */}
      {showSignInModal && (
        <div className="modal-overlay" onClick={() => setShowSignInModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowSignInModal(false)}>×</button>
            <h2>Sign in to vote</h2>
            <p>We'll email you a one-click magic link. No password needed.</p>
            <form onSubmit={handleMagicLink} className="grid">
              <input
                className="input"
                type="email"
                placeholder="you@email.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                autoFocus
              />
              <button className="button" type="submit" disabled={loading}>
                {loading ? "Sending..." : "Send magic link"}
              </button>
            </form>
          </div>
        </div>
      )}

      <header className="hero">
        <h1>Vote for the sessions you want at Claw Con</h1>
        <p>
          Browse demos and topics, then upvote your favorites. One vote per email.{" "}
          <a href="https://luma.com/moltbot-sf-show-tell" target="_blank" rel="noreferrer">
            Learn more about Claw Con →
          </a>
        </p>
        {userEmail ? (
          <div className="user-bar">
            <span className="badge">Signed in as {userEmail}</span>
            <button className="button secondary small" onClick={handleSignOut}>
              Sign out
            </button>
          </div>
        ) : null}
        {notice ? <div className="notice">{notice}</div> : null}
      </header>

      <div className="tabs">
        <button
          className={`tab ${activeTab === "speaker_demo" ? "active" : ""}`}
          onClick={() => setActiveTab("speaker_demo")}
        >
          Live demos
        </button>
        <button
          className={`tab ${activeTab === "topic" ? "active" : ""}`}
          onClick={() => setActiveTab("topic")}
        >
          Talk topics
        </button>
      </div>

      {activeTab === "topic" ? (
        <div className="panel soft">
          <strong>💡 Suggested topics:</strong> Agent security, skill routing, memory design, orchestration patterns, evaluation frameworks, observability.
        </div>
      ) : (
        <div className="panel soft">
          <strong>🎬 Demo ideas:</strong> Multi-agent workflows, safe tool gating, vector memory, eval harness, skill routers.<br />
          <span className="muted">Include a GitHub repo or video link. Open source projects get priority! 🌟</span>
        </div>
      )}

      <section className="grid submissions-grid">
        {filteredSubmissions.length === 0 ? (
          <div className="panel empty-state">
            No submissions yet — be the first to add one! 🚀
          </div>
        ) : (
          filteredSubmissions.map((submission) => (
            <article key={submission.id} className="panel card">
              <div>
                <h2>{submission.title}</h2>
                <p>{submission.description}</p>
                <p>
                  <strong>Presenter:</strong> {submission.presenter_name}
                </p>
                <p className="muted">
                  {submission.submitted_by === "bot_on_behalf"
                    ? `Submitted by bot on behalf of ${submission.submitted_for_name || "someone"}`
                    : `Submitted by ${submission.submitted_by}`}
                </p>
              </div>
              {submission.links && submission.links.length > 0 ? (
                <div className="links">
                  {submission.links.map((link) => (
                    <a
                      key={link}
                      href={link}
                      target="_blank"
                      rel="noreferrer"
                      className="link-pill"
                    >
                      {link.replace(/^https?:\/\//, "")}
                    </a>
                  ))}
                </div>
              ) : null}
              <div className="card-footer">
                <div className="badges">
                  <span className="badge">{submission.vote_count} votes</span>
                  {submission.links?.some((l) => l.includes("github.com")) && (
                    <span className="badge oss">Open Source</span>
                  )}
                </div>
                <button
                  className="button"
                  onClick={() => handleVote(submission.id)}
                  disabled={voteLoading === submission.id}
                >
                  {voteLoading === submission.id ? "Voting..." : "Upvote"}
                </button>
              </div>
            </article>
          ))
        )}
      </section>

      {session ? (
        <section className="panel">
          <h2>Submit a session</h2>
          <p className="muted">Share your demo or topic idea with the community.</p>
          <form onSubmit={handleSubmission} className="grid">
            <input
              className="input"
              type="text"
              placeholder={activeTab === "speaker_demo" ? "Demo title" : "Topic title"}
              value={formTitle}
              onChange={(event) => setFormTitle(event.target.value)}
              required
            />
            <textarea
              className="input"
              placeholder="What will attendees learn or see? 1–3 sentences."
              value={formDescription}
              onChange={(event) => setFormDescription(event.target.value)}
              required
            />
            <input
              className="input"
              type="text"
              placeholder={activeTab === "speaker_demo" ? "Presenter name" : "Topic lead (optional)"}
              value={formPresenter}
              onChange={(event) => setFormPresenter(event.target.value)}
              required={activeTab === "speaker_demo"}
            />
            <input
              className="input"
              type="text"
              placeholder={activeTab === "speaker_demo" ? "GitHub repo or video link (required)" : "GitHub repo or video link (optional)"}
              value={formLinks}
              onChange={(event) => setFormLinks(event.target.value)}
              required={activeTab === "speaker_demo"}
            />
            <button className="button" type="submit" disabled={submitLoading}>
              {submitLoading ? "Submitting..." : "Submit session"}
            </button>
          </form>
        </section>
      ) : (
        <section className="panel">
          <h2>Want to submit?</h2>
          <p>
            <button className="button" onClick={() => setShowSignInModal(true)}>
              Sign in to submit a session
            </button>
          </p>
        </section>
      )}

      <details className="panel">
        <summary><strong>🤖 For bots: API submission</strong></summary>
        <p>POST JSON to <code>/api/webhook</code> with your bot key.</p>
        <pre className="code-block">{`POST https://www.claw-con.com/api/webhook
Content-Type: application/json
x-api-key: <YOUR_BOT_KEY>

{
  "title": "Secure Skill Orchestration",
  "description": "How we keep agent tools safe at scale.",
  "presenter_name": "Jane Doe",
  "submission_type": "topic",
  "submitted_by": "bot_on_behalf",
  "submitted_for_name": "Jane Doe",
  "submitted_for_contact": "jane@email",
  "links": ["https://example.com/demo"]
}`}</pre>
      </details>

      <details className="panel">
        <summary><strong>🔑 Request a bot key</strong></summary>
        <p>One key per human email. We'll show it once — save it securely.</p>
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            const target = event.currentTarget as HTMLFormElement;
            const form = new FormData(target);
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
            setNotice(`Bot key for ${emailValue}: ${data.api_key}`);
          }}
          className="grid"
        >
          <input className="input" type="email" name="bot_email" placeholder="human@email.com" required />
          <button className="button" type="submit">Request bot key</button>
        </form>
      </details>

      <footer className="footer">
        Orchestrated by Clawd + agents. Tokens sponsored by{" "}
        <a href="https://x.com/msg" target="_blank" rel="noreferrer">@msg</a>. Source on{" "}
        <a href="https://github.com/mgalpert/clawcon-vote-app" target="_blank" rel="noreferrer">GitHub</a>.
      </footer>
    </>
  );
}
