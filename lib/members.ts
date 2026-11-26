import "server-only";
import { redirect } from "next/navigation";
import { isBootstrapAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type Role = "admin" | "member";
export type Member = { userId: string; email: string; role: Role };

/**
 * ログイン中ユーザーのロールを返す。メンバーでなければ null。
 * - 初期管理者（ALLOWED_EMAIL）は、members に行がなければ admin として自動登録する
 * - members テーブル未作成（0002 未適用）の間は、初期管理者だけを admin として扱う
 */
type AuthUser = { id: string; email?: string | null; email_confirmed_at?: string | null };

/** 初期管理者として扱ってよいか。メール確認済みでなければ、同じアドレスで勝手に登録されたアカウントの可能性があるので拒否する。 */
function bootstrap(user: AuthUser) {
  return isBootstrapAdmin(user.email) && !!user.email_confirmed_at;
}

export async function getRole(user: AuthUser): Promise<Role | null> {
  const admin = createAdminClient();
  const { data, error } = await admin.from("members").select("role").eq("user_id", user.id).maybeSingle<{ role: Role }>();
  if (error) {
    console.error("members lookup failed (0002 migration applied?):", error.message);
    return bootstrap(user) ? "admin" : null;
  }
  if (data) return data.role;
  if (bootstrap(user)) {
    const { error: e } = await admin
      .from("members")
      .upsert({ user_id: user.id, email: (user.email ?? "").toLowerCase(), role: "admin" });
    if (e) console.error("bootstrap admin insert failed:", e.message);
    return "admin";
  }
  return null;
}

/** Server Component / Server Action 用。メンバーでなければ /login へ。 */
export async function requireMember(): Promise<Member> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");
  const role = await getRole(data.user);
  if (!role) redirect("/login?error=denied");
  return { userId: data.user.id, email: data.user.email ?? "", role };
}

/** 管理者専用の画面・操作用。UI で隠すだけでなく、操作のたびにサーバー側で必ず確認する。 */
export async function requireAdmin(): Promise<Member> {
  const m = await requireMember();
  if (m.role !== "admin") redirect("/dashboard?error=forbidden");
  return m;
}
