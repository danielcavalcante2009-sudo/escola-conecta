import { createClient as createSupabaseClient, SupabaseClient } from "@supabase/supabase-js";

/** Cliente ADMIN (service-role) — usar SOMENTE em rotas de servidor. */
export function createAdminClient(): SupabaseClient {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
