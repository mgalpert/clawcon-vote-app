import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";

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
      .map((link: string) => link.trim())
      .filter((link) => link.startsWith("http://") || link.startsWith("https://"));

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
