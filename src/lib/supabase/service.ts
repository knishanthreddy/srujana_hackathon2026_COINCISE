import { createClient } from "@supabase/supabase-js";

/**
 * STRICTLY SERVER-SIDE ONLY.
 * Never import or invoke this file in client-side ("use client") components.
 */
export function getSupabaseServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (
    !supabaseUrl ||
    !serviceRoleKey ||
    supabaseUrl.includes("your-project-id") ||
    serviceRoleKey.includes("your-service-role-key")
  ) {
    return null;
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
