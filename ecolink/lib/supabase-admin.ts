import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/database.types";

export function createSupabaseAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const adminKey = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !adminKey) {
    throw new Error("Missing Supabase admin environment variables.");
  }

  return createClient<Database>(url, adminKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
