"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function sendMagicLink(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const allowed = (process.env.ALLOWED_EMAIL ?? "").trim().toLowerCase();
  // 管理者以外にはメールを送らない（結果は同じ表示にして存在確認に使われないようにする）
  if (allowed && email === allowed) {
    const h = await headers();
    const origin = process.env.NEXT_PUBLIC_SITE_URL ?? `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host")}`;
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${origin}/auth/callback` },
    });
    if (error) console.error("signInWithOtp failed", error.message);
  }
  redirect("/login?sent=1");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
