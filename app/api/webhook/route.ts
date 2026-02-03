import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";

const ALLOWED_DOMAINS = [
  "github.com",
  "gitlab.com",
  "bitbucket.org",
  "youtube.com",
  "youtu.be",
  "vimeo.com",
  "loom.com",
  "drive.google.com",
  "docs.google.com",
  "notion.so",
  "figma.com",
  "twitter.com",
  "x.com",
  "linkedin.com",
  "huggingface.co",
  "arxiv.org",
  "medium.com",
  "dev.to",
  "substack.com"
];

function sanitizeLink(link: string): string | null {
  try {
    const url = new URL(link);
    if (url.protocol !== "https:") return null;
    const host = url.hostname.replace(/^www\./, "");
    if (!ALLOWED_DOMAINS.some((d) => host === d || host.endsWith("." + d))) {
      return null;
    }
    return url.toString();
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    const title = typeof payload.title === "string" ? payload.title.trim() : "";
    const description =
      typeof payload.description === "string" ? payload.description.trim() : "";
    const presenterName =
      typeof payload.presenter_name === "string"
        ? payload.presenter_name.trim()
        : "";
    const rawLinks = Array.isArray(payload.links)
      ? payload.links.filter((link: unknown) => typeof link === "string")
      : [];
    const links = rawLinks
      .map((link: string) => sanitizeLink(link.trim()))
      .filter((link): link is string => link !== null);

    const submissionType =
      payload.submission_type === "topic" ? "topic" : "speaker_demo";

    const submittedBy =
      payload.submitted_by === "bot_on_behalf"
        ? "bot_on_behalf"
        : payload.submitted_by === "human"
          ? "human"
          : "bot";

    const submittedForName =
      typeof payload.submitted_for_name === "string"
        ? payload.submitted_for_name.trim()
        : "";
    const submittedForContact =
      typeof payload.submitted_for_contact === "string"
        ? payload.submitted_for_contact.trim()
        : "";

    if (!title || !description || !presenterName) {
      return NextResponse.json(
        { error: "Missing required fields." },
        { status: 400 }
      );
    }

    if (submittedBy === "bot_on_behalf" && !submittedForName) {
      return NextResponse.json(
        { error: "Missing submitted_for_name for bot_on_behalf." },
        { status: 400 }
      );
    }

    const apiKey = request.headers.get("x-api-key") || "";
    const { data: keyRow } = await supabaseAdmin
      .from("bot_keys")
      .select("email")
      .eq("api_key", apiKey)
      .maybeSingle();

    if (!apiKey || !keyRow?.email) {
      return NextResponse.json({ error: "Invalid bot API key." }, { status: 401 });
    }

    const { error } = await supabaseAdmin.from("submissions").insert({
      title,
      description,
      presenter_name: presenterName,
      links: links.length > 0 ? links : null,
      submission_type: submissionType,
      submitted_by: submittedBy,
      submitted_for_name: submittedForName || null,
      submitted_for_contact: submittedForContact || null
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Invalid JSON payload." },
      { status: 400 }
    );
  }
}
