import { auth } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/database.types";
import { getSupabasePublicConfig } from "@/lib/supabase-config";

export async function createClerkSupabaseServerClient() {
  const { getToken, userId } = await auth();
  if (!userId) return null;

  const { url, publishableKey } = getSupabasePublicConfig();
  return createClient<Database>(url, publishableKey, {
    accessToken: async () => getToken(),
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
