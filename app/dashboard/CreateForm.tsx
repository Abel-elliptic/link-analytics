"use client";

import { useActionState } from "react";
import { createLink, type CreateState } from "./actions";

export default function CreateForm() {
  const [state, action, pending] = useActionState<CreateState, FormData>(createLink, {});
  return (
    <form action={action} className="card stack">
      <h2>新しい短縮リンク</h2>
      <label>
        遷移先URL（必須）
        <input name="destination_url" type="url" required placeholder="https://example.com/page" />
      </label>
      <div className="grid2">
        <label>
          タイトル（管理用）
          <input name="title" placeholder="例: 11月チラシ 駅前配布" />
        </label>
        <label>
          スラッグ（空欄で自動生成）
          <input name="slug" pattern="[A-Za-z0-9_\-]{3,64}" placeholder="例: flyer-nov" />
        </label>
      </div>
      <fieldset className="grid3">
        <legend>UTM（GA4で年齢・性別を短縮リンク別に見るために使います。utm_content には自動でスラッグが入ります）</legend>
        <label>
          utm_source
          <input name="utm_source" placeholder="flyer / instagram など" />
        </label>
        <label>
          utm_medium
          <input name="utm_medium" placeholder="offline / social など" />
        </label>
        <label>
          utm_campaign
          <input name="utm_campaign" placeholder="2026_nov など" />
        </label>
      </fieldset>
      {state.error && <p className="error">{state.error}</p>}
      <button type="submit" disabled={pending}>
        {pending ? "作成中…" : "短縮URLを作成"}
      </button>
    </form>
  );
}
