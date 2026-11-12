import { signInWithPassword } from "./actions";

const ERRORS: Record<string, string> = {
  password: "メールアドレスまたはパスワードが違います。",
  rate: "ログインの試行回数が多すぎます。しばらく待ってからお試しください。",
  denied: "このアカウントには利用権限がありません。管理者に追加を依頼してください。",
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <main className="narrow">
      <h1>ログイン</h1>
      {error && <p className="error">{ERRORS[error] ?? "ログインに失敗しました。もう一度お試しください。"}</p>}
      <form action={signInWithPassword} className="card stack">
        <label>
          メールアドレス
          <input type="email" name="email" required autoComplete="email" />
        </label>
        <label>
          パスワード
          <input type="password" name="password" required autoComplete="current-password" />
        </label>
        <button type="submit">ログイン</button>
      </form>
      <p className="sub">アカウントの追加やパスワードの再設定は、管理者に依頼してください。</p>
    </main>
  );
}
