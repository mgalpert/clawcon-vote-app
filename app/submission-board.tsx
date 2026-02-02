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

    const { error } = await supabase.from("submissions").insert({
      title: formTitle,
      description: formDescription,
      presenter_name: formPresenter,
      links: links.length > 0 ? links : null
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

  return (
    <>
      <header>
        <h1>Event Submissions + Voting</h1>
        <p>
          Vote on the sessions you want to see. Upvotes are limited to one per
          authenticated email.
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

      {session ? (
        <section className="panel">
          <h2>Submit a session</h2>
          <form onSubmit={handleSubmission} className="grid">
            <input
              className="input"
              type="text"
              placeholder="Talk title"
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
              placeholder="Presenter name"
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
        {sortedSubmissions.length === 0 ? (
          <div className="panel">No submissions yet. Add the first one!</div>
        ) : (
          sortedSubmissions.map((submission) => (
            <article key={submission.id} className="panel card">
              <div>
                <h2>{submission.title}</h2>
                <p>{submission.description}</p>
                <p>
                  <strong>Presenter:</strong> {submission.presenter_name}
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
    </>
  );
}
