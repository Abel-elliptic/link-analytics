"use client";

import { useState } from "react";

const ID_RE = /^G-[A-Z0-9]{4,20}$/;

/** 測定ID を入れると、遷移先サイトに貼る Google タグ（gtag.js）を表示する。 */
export default function Snippet() {
  const [id, setId] = useState("");
  const [copied, setCopied] = useState(false);
  const valid = ID_RE.test(id);
  const shown = valid ? id : "G-XXXXXXXXXX";
  const code = `<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=${shown}"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());

  gtag('config', '${shown}');
</script>`;
  return (
    <div className="stack">
      <label>
        測定ID（G- で始まる英数字）
        <input value={id} onChange={(e) => setId(e.target.value.trim().toUpperCase())} placeholder="G-XXXXXXXXXX" />
      </label>
      {id && !valid && <p className="error">測定IDは「G-」で始まる英数字です。</p>}
      <pre className="code">{code}</pre>
      <button
        type="button"
        className="ghost small"
        disabled={!valid}
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(code);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          } catch {
            setCopied(false);
          }
        }}
      >
        {copied ? "コピーしました" : "タグをコピー"}
      </button>
    </div>
  );
}
