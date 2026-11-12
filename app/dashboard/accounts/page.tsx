import { isBootstrapAdmin } from "@/lib/auth";
import { requireAdmin, type Role } from "@/lib/members";
import { createAdminClient } from "@/lib/supabase/admin";
import Nav from "../Nav";
import { changeRole, deleteAccount } from "./actions";
import { AddAccountForm, DeleteButton, ResetPasswordForm } from "./Forms";

export const dynamic = "force-dynamic";

type Row = { user_id: string; email: string; role: Role; created_at: string };

export default async function AccountsPage() {
  const me = await requireAdmin();
  const { data, error } = await createAdminClient()
    .from("members")
    .select("user_id, email, role, created_at")
    .order("created_at")
    .returns<Row[]>();
  const admins = (data ?? []).filter((r) => r.role === "admin").length;

  return (
    <main>
      <Nav me={me} />
      <h1>アカウント管理</h1>
      {error && <p className="error">読み込みに失敗しました（0002_members.sql は適用済みですか？）: {error.message}</p>}
      <AddAccountForm />
      <table>
        <thead>
          <tr>
            <th>メールアドレス</th>
            <th>権限</th>
            <th>追加日</th>
            <th>パスワード再設定</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {(data ?? []).map((r) => {
            const self = r.user_id === me.userId;
            const locked = self || isBootstrapAdmin(r.email) || (r.role === "admin" && admins <= 1);
            return (
              <tr key={r.user_id}>
                <td>
                  {r.email}
                  {self && <span className="sub">（あなた）</span>}
                  {isBootstrapAdmin(r.email) && <div className="sub">初期管理者（削除・権限変更不可）</div>}
                </td>
                <td>
                  {locked ? (
                    r.role === "admin" ? "管理者" : "メンバー"
                  ) : (
                    <form action={changeRole} className="row inline">
                      <input type="hidden" name="user_id" value={r.user_id} />
                      <input type="hidden" name="role" value={r.role === "admin" ? "member" : "admin"} />
                      {r.role === "admin" ? "管理者" : "メンバー"}
                      <button className="ghost small">{r.role === "admin" ? "メンバーにする" : "管理者にする"}</button>
                    </form>
                  )}
                </td>
                <td>{new Date(r.created_at).toLocaleDateString("ja-JP", { timeZone: "Asia/Tokyo" })}</td>
                <td>
                  <ResetPasswordForm userId={r.user_id} />
                </td>
                <td>
                  {!locked && <DeleteButton action={deleteAccount} userId={r.user_id} email={r.email} />}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="sub">
        削除したアカウントが作成した短縮リンクとクリック記録は残ります。リンクの作成・分析は全メンバーで共有されます。
      </p>
    </main>
  );
}
