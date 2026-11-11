import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/** ログインユーザーとして動くクライアント（RLS 適用）。 */
export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (toSet) => {
          try {
            toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Server Component からの呼び出しでは set できない。proxy.ts がセッションを更新する。
          }
        },
      },
    },
  );
}
