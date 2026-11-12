"use server";

import { redirect } from "next/navigation";
import { getRole } from "@/lib/members";
import { createClient } from "@/lib/supabase/server";

export async function signInWithPassword(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) {
    console.error("signInWithPassword failed:", error?.code, error?.message);
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
