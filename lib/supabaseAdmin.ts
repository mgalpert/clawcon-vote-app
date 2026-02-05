import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let _admin: SupabaseClient | null = null;

/**
 * Service-role Supabase client (server-only).
 *
 * Important: do NOT throw at module load time; it breaks Next.js builds when env vars
 * are only present at runtime (e.g. Vercel).
 */
export function getSupabaseAdmin(): SupabaseClient {
  if (_admin) return _admin;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error("Missing Supabase service role env vars");
  }

  _admin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  });

  return _admin;
}
