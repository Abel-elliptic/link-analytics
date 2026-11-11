import "server-only";
import { createClient } from "@supabase/supabase-js";

/** service role クライアント。RLS をバイパスするため、サーバー側のリダイレクト処理専用。 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY が未設定です");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
