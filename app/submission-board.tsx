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
  const [activeTab, setActiveTab] = useState<"speaker_demo" | "topic">(
    "speaker_demo"
  );

  const userEmail = session?.user?.email ?? null;

  const fetchSubmissions = async () => {
    const { data, error } = await supabase.rpc("get_submissions_with_votes");
    if (error) {
      setNotice(error.message);
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
      }
    );

    fetchSubmissions();

    return () => {
      isMounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  const canVote = Boolean(session);

  const handleMagicLink = async (event: React.FormEvent) => {
    event.preventDefault();
    setNotice(null);
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo:
          process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
      }
    });
    setLoading(false);
    if (error) {
      setNotice(error.message);
      return;
    }
    setNotice("Magic link sent! Check your email.");
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const handleVote = async (submissionId: string) => {
    setNotice(null);
    setVoteLoading(submissionId);
    const { error } = await supabase.from("votes").insert({
      submission_id: submissionId
    });
    setVoteLoading(null);
    if (error) {
      if (error.code === "23505") {
        setNotice("You already voted for this session.");
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
      setNotice("Please sign in to submit a session.");
      return;
    }
    setNotice(null);
    setSubmitLoading(true);
    const links = formLinks
      .split(",")
      .map((link) => link.trim())
      .filter(Boolean);

    const presenterValue =
      formPresenter || (activeTab === "topic" ? "Community" : "");

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
    setNotice("Submission received!");
    fetchSubmissions();
  };

  const sortedSubmissions = useMemo(() => submissions, [submissions]);
  const filteredSubmissions = useMemo(
    () => sortedSubmissions.filter((item) => item.submission_type === activeTab),
    [sortedSubmissions, activeTab]
  );

  return (
    <>
      <header>
        <h1>Event Submissions + Voting</h1>
        <p>
          Help the community decide who they want to hear from at{" "}
          <a href="https://luma.com/moltbot-sf-show-tell" target="_blank" rel="noreferrer">
            Claw Con
          </a>
          . Upvotes are limited to one per authenticated email.
        </p>
        <div className="panel">
          <h3>Sign in to vote</h3>
          <p>
            We use magic links powered by Supabase. Submit your email to receive
            a sign-in link.
          </p>
          {userEmail ? (
            <div className="card-footer">
              <span className="badge">Signed in as {userEmail}</span>
              <button className="button secondary" onClick={handleSignOut}>
                Sign out
              </button>
            </div>
          ) : (
            <form onSubmit={handleMagicLink} className="grid">
              <input
                className="input"
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
              <button className="button" type="submit" disabled={loading}>
                {loading ? "Sending..." : "Send magic link"}
              </button>
            </form>
          )}
        </div>
        <div className="notice">
          Submissions can be added via the form below (signed-in only) or by
          posting JSON to <code>/api/webhook</code>.
        </div>
        {notice ? <div className="notice">{notice}</div> : null}
      </header>

      <div className="tabs">
        <button
          className={`tab ${activeTab === "speaker_demo" ? "active" : ""}`}
          onClick={() => setActiveTab("speaker_demo")}
        >
          Speaker demos
        </button>
        <button
          className={`tab ${activeTab === "topic" ? "active" : ""}`}
          onClick={() => setActiveTab("topic")}
        >
          Topics
        </button>
      </div>

      {activeTab === "topic" ? (
        <div className="panel">
          <strong>Suggested topics:</strong> Security, Skills, Agents,
          Memory, Tooling, Orchestration, Evaluation, Observability.
        </div>
      ) : null}

      {session ? (
        <section className="panel">
          <h2>Submit a session</h2>
          <form onSubmit={handleSubmission} className="grid">
            <input
              className="input"
              type="text"
              placeholder={
                activeTab === "speaker_demo"
                  ? "Demo title"
                  : "Topic title"
              }
              value={formTitle}
              onChange={(event) => setFormTitle(event.target.value)}
              required
            />
            <textarea
              className="input"
              placeholder="Description"
              value={formDescription}
              onChange={(event) => setFormDescription(event.target.value)}
              required
            />
            <input
              className="input"
              type="text"
              placeholder={
                activeTab === "speaker_demo"
                  ? "Presenter name"
                  : "Topic lead (optional)"
              }
              value={formPresenter}
              onChange={(event) => setFormPresenter(event.target.value)}
              required
            />
            <input
              className="input"
              type="text"
              placeholder="Links (comma separated)"
              value={formLinks}
              onChange={(event) => setFormLinks(event.target.value)}
            />
            <button className="button" type="submit" disabled={submitLoading}>
              {submitLoading ? "Submitting..." : "Submit session"}
            </button>
          </form>
        </section>
      ) : null}

      <section className="grid">
        {filteredSubmissions.length === 0 ? (
          <div className="panel">No submissions yet. Add the first one!</div>
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
                    ? `Submitted by bot on behalf of ${
                        submission.submitted_for_name || "someone"
                      }`
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
                <span className="badge">{submission.vote_count} votes</span>
                <button
                  className="button"
                  onClick={() => handleVote(submission.id)}
                  disabled={!canVote || voteLoading === submission.id}
                >
                  {canVote
                    ? voteLoading === submission.id
                      ? "Voting..."
                      : "Upvote"
                    : "Sign in to vote"}
                </button>
              </div>
            </article>
          ))
        )}
      </section>

      <footer className="footer">
        Orchestrated by Clawd + agents. Tokens sponsored by{" "}
        <a href="https://x.com/msg" target="_blank" rel="noreferrer">
          @msg
        </a>
        .
      </footer>
    </>
  );
}
