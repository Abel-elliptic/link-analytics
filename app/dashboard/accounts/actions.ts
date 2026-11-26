"use server";

import { revalidatePath } from "next/cache";
import { isBootstrapAdmin } from "@/lib/auth";
import { requireAdmin, type Role } from "@/lib/members";
import { createAdminClient } from "@/lib/supabase/admin";

export type AccountState = { error?: string; ok?: string };

const MIN_PASSWORD = 8;
const MAX_PASSWORD = 72; // Supabase(bcrypt) は 72 バイトまでしか使わない
const asRole = (v: FormDataEntryValue | null): Role => (v === "admin" ? "admin" : "member");

async function adminCount() {
  const { count } = await createAdminClient().from("members").select("*", { count: "exact", head: true }).eq("role", "admin");
  return count ?? 0;
}

export async function addAccount(_prev: AccountState, formData: FormData): Promise<AccountState> {
  await requireAdmin();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const role = asRole(formData.get("role"));
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { error: "メールアドレスの形式が正しくありません。" };
  if (password.length < MIN_PASSWORD) return { error: `パスワードは${MIN_PASSWORD}文字以上にしてください。` };
  if (password.length > MAX_PASSWORD) return { error: `パスワードは${MAX_PASSWORD}文字以内にしてください。` };

  const admin = createAdminClient();
  // email_confirm: true → 確認メールを送らずに有効化（メール送信上限の影響を受けない）
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error || !data.user) {
    if (error?.code === "email_exists") return { error: "このメールアドレスは既に登録されています。" };
    if (error?.code === "weak_password") return { error: "パスワードが弱すぎます。より長く複雑なものにしてください。" };
    return { error: `追加に失敗しました: ${error?.message ?? "不明なエラー"}` };
  }
  const { error: e } = await admin.from("members").insert({ user_id: data.user.id, email, role });
  if (e) {
    await admin.auth.admin.deleteUser(data.user.id); // 中途半端なアカウントを残さない
    return { error: `追加に失敗しました（0002_members.sql は適用済みですか？）: ${e.message}` };
  }
  revalidatePath("/dashboard/accounts");
  return { ok: `${email} を${role === "admin" ? "管理者" : "メンバー"}として追加しました。初期パスワードを本人に安全な方法で伝えてください。` };
}

export async function resetPassword(_prev: AccountState, formData: FormData): Promise<AccountState> {
  const me = await requireAdmin();
  const userId = String(formData.get("user_id"));
  const password = String(formData.get("password") ?? "");
  if (password.length < MIN_PASSWORD) return { error: `パスワードは${MIN_PASSWORD}文字以上にしてください。` };
  const admin = createAdminClient();
  const { data: target } = await admin.from("members").select("email").eq("user_id", userId).maybeSingle();
  if (!target) return { error: "対象のアカウントが見つかりません。" };
  // 初期管理者のパスワードは本人だけが変更できる（他の管理者による乗っ取りを防ぐ）
  if (isBootstrapAdmin(target.email) && userId !== me.userId) return { error: "初期管理者のパスワードは本人しか変更できません。" };
  const { error } = await admin.auth.admin.updateUserById(userId, { password });
  if (error) return { error: `変更に失敗しました: ${error.message}` };
  return { ok: "パスワードを変更しました。" };
}

export async function changeRole(formData: FormData) {
  const me = await requireAdmin();
  const userId = String(formData.get("user_id"));
  const role = asRole(formData.get("role"));
  if (userId === me.userId) return; // 自分の権限は変えられない（締め出し防止）
  const admin = createAdminClient();
  const { data: target } = await admin.from("members").select("email, role").eq("user_id", userId).maybeSingle();
  if (!target || isBootstrapAdmin(target.email)) return;
  if (target.role === "admin" && role === "member" && (await adminCount()) <= 1) return;
  await admin.from("members").update({ role }).eq("user_id", userId);
  revalidatePath("/dashboard/accounts");
}

export async function deleteAccount(formData: FormData) {
  const me = await requireAdmin();
  const userId = String(formData.get("user_id"));
  if (userId === me.userId) return;
  const admin = createAdminClient();
  const { data: target } = await admin.from("members").select("email, role").eq("user_id", userId).maybeSingle();
  if (!target || isBootstrapAdmin(target.email)) return;
  if (target.role === "admin" && (await adminCount()) <= 1) return;
  // auth ユーザーを消すと members は連動削除。作成したリンクとクリック記録は残る
  await admin.auth.admin.deleteUser(userId);
  revalidatePath("/dashboard/accounts");
}
