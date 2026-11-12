import { sendMagicLink } from "./actions";

const ERRORS: Record<string, string> = {
  rate: "メールの再送は約60秒あけてください。すでに届いているメールがあれば、それを開いてください。",
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
      {sent ? (
        <p className="note">
          登録済みのアドレスであれば、ログイン用リンクをメールで送信しました。届いたメールのリンクを開いてください（迷惑メールフォルダもご確認ください）。
        </p>
      ) : (
        <form action={sendMagicLink} className="card stack">
          <label>
            メールアドレス
            <input type="email" name="email" required autoComplete="email" />
          </label>
          <button type="submit">ログインリンクを送る</button>
        </form>
      )}
      {error && <p className="error">{ERRORS[error] ?? "ログインに失敗しました。もう一度お試しください。"}</p>}
    </main>
  );
}
