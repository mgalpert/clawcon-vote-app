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
    const links = Array.isArray(payload.links)
      ? payload.links.filter((link: unknown) => typeof link === "string")
      : null;

    if (!title || !description || !presenterName) {
      return NextResponse.json(
        { error: "Missing required fields." },
        { status: 400 }
      );
    }

    const { error } = await supabaseAdmin.from("submissions").insert({
      title,
      description,
      presenter_name: presenterName,
      links
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
