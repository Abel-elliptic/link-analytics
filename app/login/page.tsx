import { sendMagicLink, signInWithPassword } from "./actions";

const ERRORS: Record<string, string> = {
  password: "メールアドレスまたはパスワードが違います。",
  rate: "メールの送信数の上限に達しました（Supabase標準のメール送信は1時間に2通まで）。パスワードでログインするか、時間をおいてください。",
  send: "メールを送信できませんでした。時間をおいてもう一度お試しください。",
  expired: "ログインリンクが無効か期限切れです。もう一度ログインリンクを送ってください（届いた最新のメールのリンクを使ってください）。",
  browser: "ログインを確定できませんでした。ログインボタンを押したのと同じブラウザでメールのリンクを開くか、もう一度お試しください。",
  link: "ログインリンクが正しくありません。もう一度ログインリンクを送ってください。",
  denied: "このアカウントではログインできません。",
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ sent?: string; error?: string }> }) {
  const { sent, error } = await searchParams;
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
      <details className="card">
        <summary className="sub">パスワードを使わずにメールのリンクでログインする</summary>
        {sent ? (
          <p className="note">
            登録済みのアドレスであれば、ログイン用リンクをメールで送信しました（迷惑メールフォルダもご確認ください）。
          </p>
        ) : (
          <form action={sendMagicLink} className="stack" style={{ marginTop: 12 }}>
            <label>
              メールアドレス
              <input type="email" name="email" required autoComplete="email" />
            </label>
            <button type="submit" className="ghost">ログインリンクを送る</button>
            <p className="sub">Supabase標準のメール送信は1時間に2通までです。</p>
          </form>
        )}
      </details>
    </main>
  );
}
