"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../../../lib/supabaseClient";
import type { Submission } from "../../../lib/types";

interface Comment {
  id: string;
  submission_id: string;
  author_display_name: string | null;
  content: string;
  created_at: string;
}
import { getDomain, timeAgo } from "../../../lib/utils";

export default function PostPage() {
  const params = useParams();
  const router = useRouter();
  const postId = params.id as string;

  const [submission, setSubmission] = useState<Submission | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState("");
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [voteLoading, setVoteLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [emailLoading, setEmailLoading] = useState(false);
  const [showSignInModal, setShowSignInModal] = useState(false);

  const fetchSubmission = useCallback(async () => {
    const { data, error } = await supabase
      .rpc("get_submissions_with_votes")
      .eq("id", postId)
      .single();
    
    if (error || !data) {
      console.error("Failed to fetch submission:", error);
      return;
    }
    setSubmission(data as Submission);
  }, [postId]);

  const fetchComments = useCallback(async () => {
    const { data, error } = await supabase
      .from("comments")
      .select("id, submission_id, author_display_name, content, created_at")
      .eq("submission_id", postId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Failed to fetch comments:", error);
      return;
    }
    setComments(data || []);
  }, [postId]);

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

    Promise.all([fetchSubmission(), fetchComments()]).then(() => {
      if (isMounted) setLoading(false);
    });

    return () => {
      isMounted = false;
      authListener.subscription.unsubscribe();
    };
  }, [fetchSubmission, fetchComments]);

  const handleMagicLink = async (event: React.FormEvent) => {
    event.preventDefault();
    setNotice(null);
    setEmailLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/post/${postId}`
      }
    });
    setEmailLoading(false);
    if (error) {
      setNotice(error.message);
      return;
    }
    setNotice("Check your inbox for your sign-in link ✨ (check spam if you don't see it!)");
    setShowSignInModal(false);
  };

  const handleVote = async () => {
    if (!session) {
      setShowSignInModal(true);
      return;
    }
    setNotice(null);
    setVoteLoading(true);
    const { error } = await supabase.from("votes").insert({
      submission_id: postId
    });
    setVoteLoading(false);
    if (error) {
      if (error.code === "23505") {
        setNotice("You've already voted for this one.");
      } else {
        setNotice(error.message);
      }
      return;
    }
    fetchSubmission();
  };

  const handleComment = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!session) {
      setShowSignInModal(true);
      return;
    }
    if (!commentText.trim()) return;
    
    setCommentSubmitting(true);
    const { error } = await supabase.from("comments").insert({
      submission_id: postId,
      user_id: session.user.id,
      author_email: session.user.email,
      content: commentText.trim()
    });
    setCommentSubmitting(false);
    
    if (error) {
      setNotice(error.message);
      return;
    }
    
    setCommentText("");
    fetchComments();
    fetchSubmission(); // Update comment count
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  if (loading) {
    return (
      <div className="post-page">
        <div className="hn-header">
          <div className="hn-header-left">
            <Link href="/" className="hn-logo">
              <span className="hn-logo-icon">🦞</span>
              <span className="hn-logo-text">ClawdCon</span>
            </Link>
          </div>
        </div>
        <main className="post-main">
          <div className="post-loading">Loading...</div>
        </main>
      </div>
    );
  }

  if (!submission) {
    return (
      <div className="post-page">
        <div className="hn-header">
          <div className="hn-header-left">
            <Link href="/" className="hn-logo">
              <span className="hn-logo-icon">🦞</span>
              <span className="hn-logo-text">ClawdCon</span>
            </Link>
          </div>
        </div>
        <main className="post-main">
          <div className="post-not-found">
            <h1>Post not found</h1>
            <p>This submission doesn't exist or has been removed.</p>
            <Link href="/" className="hn-button">← Back to home</Link>
          </div>
        </main>
      </div>
    );
  }

  const primaryLink = submission.links?.[0];
  const domain = primaryLink ? getDomain(primaryLink) : null;
  const userEmail = session?.user?.email ?? null;

  return (
    <div className="post-page">
      {/* Sign-in Modal */}
      {showSignInModal && (
        <div className="modal-overlay" onClick={() => setShowSignInModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowSignInModal(false)}>×</button>
            <h2>Sign in to participate</h2>
            <p>We'll email you a one-click magic link. No password needed.</p>
            <form onSubmit={handleMagicLink} className="modal-form">
              <input
                className="input"
                type="email"
                placeholder="you@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
              />
              <button className="hn-button" type="submit" disabled={emailLoading}>
                {emailLoading ? "Sending..." : "Send magic link"}
              </button>
            </form>
          </div>
        </div>
      )}

      <div className="hn-header">
        <div className="hn-header-left">
          <Link href="/" className="hn-logo">
            <span className="hn-logo-icon">🦞</span>
            <span className="hn-logo-text">ClawdCon</span>
          </Link>
          <nav className="hn-nav">
            <Link href="/" className="hn-nav-link">demos</Link>
            <span className="hn-nav-sep">|</span>
            <Link href="/?tab=topic" className="hn-nav-link">topics</Link>
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

      <main className="post-main">
        <article className="post-article">
          {/* Post header */}
          <header className="post-header">
            <div className="post-vote-section">
              <button
                className="hn-upvote large"
                onClick={handleVote}
                disabled={voteLoading}
                title="upvote"
              >
                ▲
              </button>
              <span className="post-vote-count">{submission.vote_count}</span>
            </div>
            <div className="post-header-content">
              <h1 className="post-title">
                {primaryLink ? (
                  <a href={primaryLink} target="_blank" rel="noreferrer">
                    {submission.title}
                  </a>
                ) : (
                  submission.title
                )}
                {domain && <span className="hn-domain">({domain})</span>}
              </h1>
              <div className="post-meta">
                <span className="post-type-badge">
                  {submission.submission_type === "speaker_demo" ? "🎬 Demo" : "💡 Topic"}
                </span>
                {submission.is_openclaw_contributor && (
                  <span className="hn-badge contributor" title="OpenClawdContributor">🦞</span>
                )}
                {submission.links?.some((l) => l.includes("github.com")) && (
                  <span className="hn-badge oss" title="Open Source">⭐</span>
                )}
                <span className="post-meta-sep">·</span>
                <span>by <strong>{submission.presenter_name}</strong></span>
                {submission.created_at && (
                  <>
                    <span className="post-meta-sep">·</span>
                    <span>{timeAgo(submission.created_at)}</span>
                  </>
                )}
              </div>
            </div>
          </header>

          {/* Post body */}
          <div className="post-body">
            <p className="post-description">{submission.description}</p>
            
            {submission.links && submission.links.length > 0 && (
              <div className="post-links">
                <h3>Links</h3>
                <ul>
                  {submission.links.map((link) => (
                    <li key={link}>
                      <a href={link} target="_blank" rel="noreferrer">
                        {link.replace(/^https?:\/\//, "")}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {submission.submitted_by !== "human" && (
              <p className="post-submitted-by">
                {submission.submitted_by === "bot_on_behalf"
                  ? `Submitted by bot on behalf of ${submission.submitted_for_name || "someone"}`
                  : `Submitted by ${submission.submitted_by}`}
              </p>
            )}
          </div>
        </article>

        {/* Comments section */}
        <section className="post-comments">
          <h2>{comments.length} Comment{comments.length !== 1 ? "s" : ""}</h2>
          
          {/* Comment form */}
          {session ? (
            <form onSubmit={handleComment} className="post-comment-form">
              <textarea
                className="input"
                placeholder="Add a comment..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                rows={3}
              />
              <button
                className="hn-button"
                type="submit"
                disabled={commentSubmitting || !commentText.trim()}
              >
                {commentSubmitting ? "Posting..." : "Post Comment"}
              </button>
            </form>
          ) : (
            <div className="post-signin-prompt">
              <button className="hn-button" onClick={() => setShowSignInModal(true)}>
                Sign in to comment
              </button>
            </div>
          )}

          {/* Comments list */}
          <div className="post-comment-list">
            {comments.length === 0 ? (
              <p className="post-no-comments">No comments yet. Be the first to share your thoughts!</p>
            ) : (
              comments.map((comment) => (
                <div key={comment.id} className="post-comment">
                  <div className="post-comment-meta">
                    <span className="post-comment-author">
                      {comment.author_display_name || "anon"}
                    </span>
                    <span className="post-comment-time">
                      {timeAgo(comment.created_at)}
                    </span>
                  </div>
                  <p className="post-comment-content">{comment.content}</p>
                </div>
              ))
            )}
          </div>
        </section>
      </main>

      <footer className="hn-footer">
        <Link href="/">← Back to all submissions</Link>
        {" | "}
        <a href="https://github.com/mgalpert/clawcon-vote-app" target="_blank" rel="noreferrer">Source</a>
      </footer>
    </div>
  );
}
