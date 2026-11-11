"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { randomSlug, RESERVED_SLUGS, SLUG_RE } from "@/lib/links";

export type CreateState = { error?: string };

const opt = (v: FormDataEntryValue | null) => {
  const s = String(v ?? "").trim();
  return s ? s.slice(0, 200) : null;
};

export async function createLink(_prev: CreateState, formData: FormData): Promise<CreateState> {
  const destination = String(formData.get("destination_url") ?? "").trim();
  try {
    const u = new URL(destination);
    if (u.protocol !== "https:" && u.protocol !== "http:") throw new Error();
  } catch {
    return { error: "遷移先は http:// または https:// で始まるURLを入力してください。" };
  }

  const custom = opt(formData.get("slug"));
  if (custom && (!SLUG_RE.test(custom) || RESERVED_SLUGS.has(custom.toLowerCase()))) {
    return { error: "スラッグは英数字・-・_ の3〜64文字で、予約語以外にしてください。" };
  }

  const supabase = await createClient();
  const row = {
    destination_url: destination,
    title: opt(formData.get("title")),
    utm_source: opt(formData.get("utm_source")),
    utm_medium: opt(formData.get("utm_medium")),
    utm_campaign: opt(formData.get("utm_campaign")),
  };

  // 自動生成 slug は衝突時に数回リトライ
  for (let i = 0; i < (custom ? 1 : 5); i++) {
    const slug = custom ?? randomSlug();
    const { error } = await supabase.from("links").insert({ ...row, slug });
    if (!error) {
      revalidatePath("/dashboard");
      redirect(`/dashboard/${slug}`);
    }
    if (error.code !== "23505") return { error: `作成に失敗しました: ${error.message}` };
    if (custom) return { error: "そのスラッグは既に使われています。" };
  }
  return { error: "スラッグの自動生成に失敗しました。もう一度お試しください。" };
}

export async function setArchived(formData: FormData) {
  const id = String(formData.get("id"));
  const archived = formData.get("archived") === "true";
  const supabase = await createClient();
  await supabase.from("links").update({ archived }).eq("id", id);
  revalidatePath("/dashboard");
}
