"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "../../lib/supabaseClient";
import { DEFAULT_CITY_KEY, getCity, withCity } from "../../lib/cities";
import { timeAgo } from "../../lib/utils";

type SubmissionRow = {
  id: string;
  created_at: string;
  title: string;
  presenter_name: string;
  submission_type: string;
};

type VoteRow = {
  id: string;
  created_at: string;
  submission_id: string;
};

export default function LogsClient() {
  const searchParams = useSearchParams();
  const cityKey = (searchParams.get("city") ||
    DEFAULT_CITY_KEY) as typeof DEFAULT_CITY_KEY;
  const city = getCity(cityKey);

  const [submissions, setSubmissions] = useState<SubmissionRow[]>([]);
  const [votes, setVotes] = useState<VoteRow[]>([]);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setNotice(null);

      const subs = await supabase.rpc("get_public_recent_submissions", {
        _event_slug: city.eventSlug,
        _limit: 200,
      });

      if (subs.error) {
        setNotice(subs.error.message);
        return;
      }

      const v = await supabase.rpc("get_public_recent_votes", {
        _event_slug: city.eventSlug,
        _limit: 200,
      });

      if (v.error) {
        setNotice(v.error.message);
        return;
      }

      setSubmissions((subs.data as any) || []);
      setVotes((v.data as any) || []);
    })();
  }, [city.eventSlug]);

  const subById = useMemo(() => {
    const m = new Map<string, SubmissionRow>();
    for (const s of submissions) m.set(s.id, s);
    return m;
  }, [submissions]);

  return (
    <main>
      <div className="hn-header">
        <div className="hn-header-left">
          <a href={withCity("/", city.key)} className="hn-logo">
            <span className="hn-logo-icon">🦞</span>
            <span className="hn-logo-text">Claw Con</span>
          </a>

          <nav className="hn-nav">
            <a href={withCity("/", city.key)} className="hn-nav-link">
              demos/topics
            </a>
            <span className="hn-nav-sep">|</span>
            <a href={withCity("/events", city.key)} className="hn-nav-link">
              events
            </a>
            <span className="hn-nav-sep">|</span>
            <a href={withCity("/chats", city.key)} className="hn-nav-link">
              join the chat
            </a>
            <span className="hn-nav-sep">|</span>
            <a href={withCity("/logs", city.key)} className="hn-nav-link active">
              logs
            </a>
          </nav>
        </div>
      </div>

      {notice && <div className="hn-notice">{notice}</div>}

      <div className="hn-layout" style={{ gridTemplateColumns: "1fr" }}>
        <main className="hn-main">
          <div style={{ padding: "8px 0", color: "var(--hn-meta)" }}>
            Public read-only logs for <strong>{city.label}</strong>. Votes are
            anonymized.
          </div>

          <h3 style={{ margin: "12px 0 6px" }}>Recent submissions</h3>
          <table className="hn-table">
            <tbody>
              {submissions.length === 0 ? (
                <tr>
                  <td className="hn-empty">No recent submissions.</td>
                </tr>
              ) : (
                submissions.map((s) => (
                  <tr key={s.id} className="hn-row">
                    <td className="hn-content">
                      <div className="hn-title-row">
                        <Link href={`/post/${s.id}`} className="hn-title">
                          {s.title}
                        </Link>
                        <span className="hn-domain">({s.submission_type})</span>
                      </div>
                      <div className="hn-meta">
                        <span className="hn-presenter">{s.presenter_name}</span>
                        {" | "}
                        <span className="hn-time">{timeAgo(s.created_at)}</span>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          <h3 style={{ margin: "18px 0 6px" }}>Recent votes</h3>
          <table className="hn-table">
            <tbody>
              {votes.length === 0 ? (
                <tr>
                  <td className="hn-empty">No recent votes.</td>
                </tr>
              ) : (
                votes.map((v) => {
                  const s = subById.get(v.submission_id);
                  return (
                    <tr key={v.id} className="hn-row">
                      <td className="hn-content">
                        <div className="hn-title-row">
                          <Link
                            href={`/post/${v.submission_id}`}
                            className="hn-title"
                          >
                            {s ? s.title : v.submission_id}
                          </Link>
                        </div>
                        <div className="hn-meta">
                          <span className="hn-time">{timeAgo(v.created_at)}</span>
                          {" | "}
                          <span className="hn-presenter">anon</span>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </main>
      </div>
    </main>
  );
}
