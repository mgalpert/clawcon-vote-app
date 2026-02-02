import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

if (!supabaseUrl || !supabaseAnonKey) {
  // Avoid throwing during SSR; client components will still warn in dev tools.
  console.warn("Missing Supabase client env vars");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
