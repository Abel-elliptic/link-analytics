"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/browser";

/**
 * メールのログインリンクの戻り先。2 方式に対応する。
 * - implicit: URL の #access_token=...&refresh_token=...（別の端末・アプリで開いても成功する）
 * - PKCE:     URL の ?code=...（ボタンを押したのと同じブラウザでのみ成功する）
 * 許可メールアドレスかどうかは proxy.ts が /dashboard で確認する。
 */
export default function AuthCallback() {
  const [message, setMessage] = useState("ログインしています…");

  useEffect(() => {
    const run = async () => {
      const supabase = createClient();
      const hash = new URLSearchParams(window.location.hash.slice(1));
      const query = new URLSearchParams(window.location.search);
      const fail = (reason: string, detail?: string) => {
        console.error("auth callback failed:", reason, detail);
        window.location.replace(`/login?error=${reason}`);
      };

      const errDesc = hash.get("error_description") ?? query.get("error_description");
      if (errDesc) return fail("expired", errDesc);

      const accessToken = hash.get("access_token");
      const refreshToken = hash.get("refresh_token");
      if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
        if (error) return fail("expired", error.message);
        return window.location.replace("/dashboard");
      }

      const code = query.get("code");
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) return fail("browser", error.message);
        return window.location.replace("/dashboard");
      }

      setMessage("ログインリンクが正しくありません。");
      fail("link");
    };
    run();
  }, []);

  return (
    <main className="narrow">
      <p>{message}</p>
    </main>
  );
}
