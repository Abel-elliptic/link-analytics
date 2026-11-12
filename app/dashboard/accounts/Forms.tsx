"use client";

import { useActionState } from "react";
import { addAccount, resetPassword, type AccountState } from "./actions";

function Msg({ s }: { s: AccountState }) {
  if (s.error) return <p className="error">{s.error}</p>;
  if (s.ok) return <p className="okmsg">{s.ok}</p>;
  return null;
}

export function AddAccountForm() {
  const [state, action, pending] = useActionState<AccountState, FormData>(addAccount, {});
  return (
    <form action={action} className="card stack">
      <h2>アカウントを追加</h2>
      <div className="grid3">
        <label>
          メールアドレス
          <input type="email" name="email" required autoComplete="off" />
        </label>
        <label>
          初期パスワード（8文字以上）
          <input type="text" name="password" required minLength={8} autoComplete="new-password" />
        </label>
        <label>
          権限
          <select name="role" defaultValue="member">
            <option value="member">メンバー（リンク作成・分析）</option>
            <option value="admin">管理者（＋アカウント管理）</option>
          </select>
        </label>
      </div>
      <p className="sub">確認メールは送信されず、すぐにログインできる状態で作成されます。初期パスワードは本人に安全な方法で伝えてください。</p>
      <Msg s={state} />
      <button type="submit" disabled={pending}>{pending ? "追加中…" : "追加する"}</button>
    </form>
  );
}

export function ResetPasswordForm({ userId }: { userId: string }) {
  const [state, action, pending] = useActionState<AccountState, FormData>(resetPassword, {});
  return (
    <form action={action} className="row inline">
      <input type="hidden" name="user_id" value={userId} />
      <input type="text" name="password" required minLength={8} placeholder="新しいパスワード" autoComplete="new-password" />
      <button className="ghost small" disabled={pending}>変更</button>
      <Msg s={state} />
    </form>
  );
}

export function DeleteButton({ action, userId, email }: { action: (fd: FormData) => Promise<void>; userId: string; email: string }) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm(`${email} を削除します。よろしいですか？`)) e.preventDefault();
      }}
    >
      <input type="hidden" name="user_id" value={userId} />
      <button className="ghost small danger">削除</button>
    </form>
  );
}
