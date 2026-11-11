import { sendMagicLink } from "./actions";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ sent?: string; error?: string }> }) {
  const { sent, error } = await searchParams;
  return (
    <main className="narrow">
      <h1>ログイン</h1>
      {sent ? (
        <p className="note">登録済みのアドレスであれば、ログイン用リンクをメールで送信しました。</p>
      ) : (
        <form action={sendMagicLink} className="card stack">
          <label>
            メールアドレス
            <input type="email" name="email" required autoComplete="email" />
          </label>
          <button type="submit">ログインリンクを送る</button>
        </form>
      )}
      {error && <p className="error">ログインに失敗しました。もう一度お試しください。</p>}
    </main>
  );
}
