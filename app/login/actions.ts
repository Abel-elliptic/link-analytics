"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getRole } from "@/lib/members";
import { isLoginBlocked, recordLoginFailure } from "@/lib/ratelimit";
import { createClient } from "@/lib/supabase/server";
import { getClientIp } from "@/lib/tracking";

export async function signInWithPassword(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase().slice(0, 254);
  const password = String(formData.get("password") ?? "").slice(0, 200);
  const ip = getClientIp(await headers());

  // Supabase 側の回数制限はサーバー（Vercel）の IP 単位でかかるため、利用者の IP・アドレス単位の制限をアプリでも行う
  if (await isLoginBlocked(ip, email)) redirect("/login?error=rate");

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) {
    console.error("signInWithPassword failed:", error?.code, error?.message);
    await recordLoginFailure(ip, email);
    redirect(error?.status === 429 ? "/login?error=rate" : "/login?error=password");
  }
  if (!(await getRole(data.user))) {
    await supabase.auth.signOut();
    redirect("/login?error=denied");
  }
  redirect("/dashboard");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
