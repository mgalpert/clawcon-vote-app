import { createClient } from "@supabase/supabase-js";

const envUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const envAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

// Next.js may evaluate modules during build/prerender. createClient() throws if url is empty.
// Use harmless placeholders when env vars are not present (e.g. CI/build), and fail at runtime
// when real requests are attempted.
const supabaseUrl = envUrl || "http://localhost:54321";
const supabaseAnonKey = envAnonKey || "__missing_supabase_anon_key__";

if (!envUrl || !envAnonKey) {
  console.warn(
    "Missing Supabase client env vars (NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY)"
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
