import "server-only";
import { createHmac } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";

const WINDOW_MIN = 15;
const MAX_PER_IP = 20; // 同じIPからの失敗（複数アカウントへの総当たり）
const MAX_PER_EMAIL = 8; // 同じアドレスへの失敗（1アカウントへの総当たり）

function h(kind: string, v: string | null): string | null {
  const secret = process.env.IP_HASH_SECRET;
  if (!v || !secret) return null;
  return createHmac("sha256", secret).update(`${kind}:${v}`).digest("hex").slice(0, 32);
}

/** 直近15分の失敗回数が上限を超えていれば true。テーブル未作成（0003 未適用）なら制限しない。 */
export async function isLoginBlocked(ip: string | null, email: string): Promise<boolean> {
  const db = createAdminClient();
  const since = new Date(Date.now() - WINDOW_MIN * 60_000).toISOString();
  const count = async (col: "ip_hash" | "email_hash", v: string | null) => {
    if (!v) return 0;
    const { count, error } = await db.from("login_failures").select("id", { count: "exact", head: true }).eq(col, v).gte("at", since);
    if (error) {
      console.error("login_failures lookup failed (0003 applied?):", error.message);
      return 0;
    }
    return count ?? 0;
  };
  const [byIp, byEmail] = await Promise.all([count("ip_hash", h("ip", ip)), count("email_hash", h("email", email))]);
  return byIp >= MAX_PER_IP || byEmail >= MAX_PER_EMAIL;
}

export async function recordLoginFailure(ip: string | null, email: string) {
  const db = createAdminClient();
  const { error } = await db.from("login_failures").insert({ ip_hash: h("ip", ip), email_hash: h("email", email) });
  if (error) console.error("login_failures insert failed:", error.message);
  // 古い記録の掃除（1日より前）
  await db.from("login_failures").delete().lt("at", new Date(Date.now() - 86_400_000).toISOString());
}
