"use server";

import { createClient as createPlainClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { isAllowedEmail } from "@/lib/auth";
import { siteUrl } from "@/lib/site";
import { createClient } from "@/lib/supabase/server";

export async function sendMagicLink(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  // 管理者以外にはメールを送らない（表示は同じにして、登録の有無を推測されないようにする）
  if (isAllowedEmail(email)) {
    // implicit フローで送る。PKCE と違いブラウザに合言葉 Cookie を残さないため、
    // メールテンプレートを変えなくても、別の端末・アプリでリンクを開いてログインできる。
    const supabase = createPlainClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      auth: { flowType: "implicit", persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${await siteUrl()}/auth/callback`, shouldCreateUser: true },
    });
    if (error) {
      console.error("signInWithOtp failed:", error.code, error.message);
      redirect(error.status === 429 || /after \d+ seconds/.test(error.message) ? "/login?error=rate" : "/login?error=send");
    }
  }
  redirect("/login?sent=1");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
