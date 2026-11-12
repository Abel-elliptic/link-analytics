import { createBrowserClient } from "@supabase/ssr";

/** ブラウザ用クライアント。セッションは Cookie に保存され、サーバー側（proxy.ts 等）からも読める。 */
export function createClient() {
  return createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    // URL の処理は /auth/callback ページで明示的に行う
    auth: { detectSessionInUrl: false },
  });
}
